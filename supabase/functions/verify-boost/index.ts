import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, solana-client",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const PLATFORM_WALLET = "AUudUn5v4HM2EtkfM9GXSqLBAGUV5CoMgbKPWFPVV2fS";
// Must match src/pages/BoostToken.tsx
const TIERS: Record<string, { sol: number; hours: number; scoreBonus: number }> = {
  basic: { sol: 0.1, hours: 24, scoreBonus: 100 },
  pro: { sol: 0.25, hours: 72, scoreBonus: 300 },
  max: { sol: 0.5, hours: 168, scoreBonus: 800 },
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { tx_hash, token_id, tier } = await req.json();
    const t = TIERS[tier];
    if (typeof tx_hash !== "string" || tx_hash.length > 128 || typeof token_id !== "string" || !t) return json({ error: "Invalid input" }, 400);

    const RPC = Deno.env.get("SOLANA_RPC_URL") || "https://solana-rpc.publicnode.com";
    let tx: any = null;
    for (let i = 0; i < 6 && !tx; i++) {
      const r = await fetch(RPC, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransaction",
          params: [tx_hash, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }] }),
      });
      tx = (await r.json()).result;
      if (!tx) await new Promise((r) => setTimeout(r, 2500));
    }
    if (!tx) return json({ error: "Transaction not found" }, 400);
    if (tx.meta?.err) return json({ error: "Transaction failed on-chain" }, 400);

    let payer: string | null = null;
    for (const ix of tx.transaction?.message?.instructions || []) {
      if (ix.program === "system" && ix.parsed?.type === "transfer") {
        const { destination, lamports, source } = ix.parsed.info;
        if (destination === PLATFORM_WALLET && Number(lamports) >= t.sol * 1e9 * 0.99) { payer = source; break; }
      }
    }
    if (!payer) return json({ error: `Payment not verified. Must send ${t.sol} SOL to platform wallet.` }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: dup } = await sb.from("transactions").select("id").eq("tx_hash", tx_hash).maybeSingle();
    if (dup) return json({ error: "Transaction already processed" }, 400);
    const { data: token } = await sb.from("tokens").select("id").eq("id", token_id).maybeSingle();
    if (!token) return json({ error: "Token not found" }, 404);

    const expires = new Date(Date.now() + t.hours * 3600_000).toISOString();
    await sb.from("boosts").insert({ token_id, user_wallet: payer, amount: t.sol, expires_at: expires });
    await sb.from("tokens").update({ is_featured: true }).eq("id", token_id);
    const { data: st } = await sb.from("trending_stats").select("id, score").eq("token_id", token_id).maybeSingle();
    if (st) await sb.from("trending_stats").update({ score: Number(st.score) + t.scoreBonus }).eq("id", st.id);
    else await sb.from("trending_stats").insert({ token_id, score: t.scoreBonus });
    await sb.from("transactions").insert({
      user_wallet: payer, type: "BOOST", amount: t.sol, tx_hash, token_id, status: "confirmed",
      is_simulated: false, metadata: { tier, expires_at: expires },
    });
    return json({ success: true, expires_at: expires });
  } catch (e) {
    console.error("verify-boost", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
