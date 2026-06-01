import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_WALLET = "AUudUn5v4HM2EtkfM9GXSqLBAGUV5CoMgbKPWFPVV2fS";
const REQUIRED_AMOUNT_SOL = 0.3;
const LAMPORTS_PER_SOL = 1_000_000_000;

function sanitize(str: string | null, max: number): string | null {
  if (!str) return null;
  return str.replace(/<[^>]*>/g, '').replace(/[<>"'`]/g, '').trim().slice(0, max);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tx_hash, token_data } = await req.json();

    if (!tx_hash || typeof tx_hash !== 'string' || tx_hash.length > 128) {
      return new Response(JSON.stringify({ error: "Invalid tx_hash" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!token_data || !token_data.name || !token_data.symbol || !token_data.supply || !token_data.creator_wallet) {
      return new Response(JSON.stringify({ error: "Missing required token fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use server-side RPC (never exposed to client)
    const RPC_URL = Deno.env.get("SOLANA_RPC_URL") || "https://api.devnet.solana.com";
    console.log(`[verify-payment] Verifying tx=${tx_hash} via RPC=${RPC_URL}`);

    // Check signature status first for richer logs
    try {
      const sigRes = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "getSignatureStatuses",
          params: [[tx_hash], { searchTransactionHistory: true }],
        }),
      });
      const sigData = await sigRes.json();
      console.log(`[verify-payment] getSignatureStatuses:`, JSON.stringify(sigData?.result?.value?.[0] ?? null));
    } catch (e) {
      console.warn(`[verify-payment] getSignatureStatuses failed`, e);
    }

    // Retry getTransaction — RPC nodes lag behind confirmation by a few seconds.
    let tx: any = null;
    let lastRpcError: any = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const rpcResponse = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1,
          method: "getTransaction",
          params: [tx_hash, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }],
        }),
      });
      const rpcData = await rpcResponse.json();
      if (rpcData.error) {
        lastRpcError = rpcData.error;
        console.warn(`[verify-payment] attempt=${attempt} rpc error:`, JSON.stringify(rpcData.error));
      }
      if (rpcData.result) {
        tx = rpcData.result;
        console.log(`[verify-payment] tx found on attempt=${attempt} slot=${tx.slot} err=${JSON.stringify(tx.meta?.err)}`);
        break;
      }
      console.log(`[verify-payment] attempt=${attempt} tx not yet visible, retrying...`);
      await new Promise((r) => setTimeout(r, 2500));
    }

    if (!tx) {
      console.error(`[verify-payment] Tx not found after retries. lastErr=${JSON.stringify(lastRpcError)}`);
      return new Response(JSON.stringify({ error: "Transaction not found. It may still be confirming.", details: lastRpcError }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tx.meta?.err) {
      console.error(`[verify-payment] On-chain failure:`, JSON.stringify(tx.meta.err), "logs:", JSON.stringify(tx.meta?.logMessages));
      return new Response(JSON.stringify({ error: "Transaction failed on-chain", details: tx.meta.err, logs: tx.meta?.logMessages }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the payment
    const instructions = tx.transaction?.message?.instructions || [];
    console.log(`[verify-payment] Parsed instructions count=${instructions.length}`);
    let paymentVerified = false;

    for (const ix of instructions) {
      if (ix.parsed?.type === "transfer" && ix.program === "system") {
        const { destination, lamports } = ix.parsed.info;
        console.log(`[verify-payment] system transfer -> ${destination} lamports=${lamports}`);
        if (destination === PLATFORM_WALLET && Number(lamports) >= REQUIRED_AMOUNT_SOL * LAMPORTS_PER_SOL * 0.99) {
          paymentVerified = true;
          break;
        }
      }
    }

    if (!paymentVerified) {
      console.error(`[verify-payment] Payment NOT verified for tx=${tx_hash}. Expected >= ${REQUIRED_AMOUNT_SOL} SOL to ${PLATFORM_WALLET}`);
      return new Response(JSON.stringify({ error: "Payment not verified. Must send 0.3 SOL to platform wallet." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check duplicate
    const { data: existingTx } = await supabase.from("transactions").select("id").eq("tx_hash", tx_hash).single();
    if (existingTx) {
      return new Response(JSON.stringify({ error: "Transaction already processed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize all inputs server-side
    const safeName = sanitize(token_data.name, 32);
    const safeSymbol = sanitize(token_data.symbol, 10)?.toUpperCase();

    if (!safeName || !safeSymbol) {
      return new Response(JSON.stringify({ error: "Invalid token name or symbol" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: token, error: tokenError } = await supabase
      .from("tokens")
      .insert({
        name: safeName,
        symbol: safeSymbol,
        supply: Number(token_data.supply),
        decimals: Number(token_data.decimals) || 9,
        description: sanitize(token_data.description, 500),
        creator_wallet: token_data.creator_wallet,
        website: sanitize(token_data.website, 200),
        twitter: sanitize(token_data.twitter, 50),
        telegram: sanitize(token_data.telegram, 50),
        logo_url: token_data.logo_url || null,
      })
      .select()
      .single();

    if (tokenError) {
      console.error("Token creation error:", tokenError);
      return new Response(JSON.stringify({ error: "Failed to create token record" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("transactions").insert({
      user_wallet: token_data.creator_wallet,
      type: "CREATE_TOKEN",
      amount: REQUIRED_AMOUNT_SOL,
      status: "confirmed",
      tx_hash,
      token_id: token.id,
    });

    // Seed trending_stats so the new token appears in Trending immediately.
    // Newer tokens start with a small score so they show on the "Trending" tab
    // ranked just below tokens with real volume.
    await supabase.from("trending_stats").insert({
      token_id: token.id,
      price: 0,
      price_change_24h: 0,
      volume_24h: 0,
      buys_24h: 0,
      liquidity: 0,
      score: 1, // seeded baseline; cron job will recompute
    });

    console.log(`✅ Token created: ${safeName} (${safeSymbol}) | TX: ${tx_hash} | Fee: ${REQUIRED_AMOUNT_SOL} SOL -> ${PLATFORM_WALLET}`);

    return new Response(JSON.stringify({ success: true, token }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-payment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
