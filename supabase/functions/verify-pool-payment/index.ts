import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLATFORM_WALLET = "AUudUn5v4HM2EtkfM9GXSqLBAGUV5CoMgbKPWFPVV2fS";
const REQUIRED_AMOUNT_SOL = 0.2;
const LAMPORTS_PER_SOL = 1_000_000_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tx_hash, pool_data } = await req.json();

    if (!tx_hash || typeof tx_hash !== "string" || tx_hash.length > 128) {
      return new Response(JSON.stringify({ error: "Invalid tx_hash" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!pool_data?.token_id || !pool_data?.creator_wallet ||
        pool_data.sol_amount == null || pool_data.token_amount == null) {
      return new Response(JSON.stringify({ error: "Missing required pool fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RPC_URL = Deno.env.get("SOLANA_RPC_URL") || "https://api.devnet.solana.com";
    console.log(`[verify-pool] verifying tx=${tx_hash}`);

    let tx: any = null;
    let lastErr: any = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "getTransaction",
          params: [tx_hash, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }],
        }),
      });
      const data = await r.json();
      if (data.error) { lastErr = data.error; console.warn(`attempt=${attempt}`, data.error); }
      if (data.result) { tx = data.result; break; }
      await new Promise((r) => setTimeout(r, 2500));
    }

    if (!tx) {
      return new Response(JSON.stringify({ error: "Transaction not found", details: lastErr }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tx.meta?.err) {
      return new Response(JSON.stringify({ error: "Transaction failed on-chain", details: tx.meta.err }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instructions = tx.transaction?.message?.instructions || [];
    let verified = false;
    for (const ix of instructions) {
      if (ix.parsed?.type === "transfer" && ix.program === "system") {
        const { destination, lamports } = ix.parsed.info;
        if (destination === PLATFORM_WALLET && Number(lamports) >= REQUIRED_AMOUNT_SOL * LAMPORTS_PER_SOL * 0.99) {
          verified = true; break;
        }
      }
    }
    if (!verified) {
      return new Response(JSON.stringify({ error: `Payment not verified. Must send ${REQUIRED_AMOUNT_SOL} SOL to platform wallet.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: existing } = await supabase.from("transactions").select("id").eq("tx_hash", tx_hash).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "Transaction already processed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a placeholder pool address (real Raydium pool would be created on-chain)
    const poolAddress = `pool_${tx_hash.slice(0, 16)}`;

    const { data: pool, error: poolErr } = await supabase.from("liquidity_pools").insert({
      token_id: pool_data.token_id,
      creator_wallet: pool_data.creator_wallet,
      pool_address: poolAddress,
      sol_amount: Number(pool_data.sol_amount),
      token_amount: Number(pool_data.token_amount),
      liquidity_locked: false,
    }).select().single();

    if (poolErr) {
      console.error("pool insert error", poolErr);
      return new Response(JSON.stringify({ error: "Failed to create pool record", details: poolErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("tokens").update({ liquidity_added: true, pool_address: poolAddress }).eq("id", pool_data.token_id);

    await supabase.from("transactions").insert({
      user_wallet: pool_data.creator_wallet,
      type: "ADD_LIQUIDITY",
      amount: REQUIRED_AMOUNT_SOL,
      status: "confirmed",
      tx_hash,
      token_id: pool_data.token_id,
    });

    console.log(`✅ Pool created: ${poolAddress} for token ${pool_data.token_id}`);
    return new Response(JSON.stringify({ success: true, pool }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-pool-payment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
