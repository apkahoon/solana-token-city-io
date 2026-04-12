import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_WALLET = "QLcWFBchUq7tzK91MqZBexQL7hVohATAgdsoGAGu5Ra";
const REQUIRED_AMOUNT_SOL = 0.3;
const LAMPORTS_PER_SOL = 1_000_000_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tx_hash, token_data } = await req.json();

    if (!tx_hash || !token_data) {
      return new Response(JSON.stringify({ error: "Missing tx_hash or token_data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify transaction on Solana mainnet
    const rpcResponse = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [tx_hash, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
      }),
    });

    const rpcData = await rpcResponse.json();

    if (!rpcData.result) {
      return new Response(JSON.stringify({ error: "Transaction not found. It may still be confirming." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tx = rpcData.result;

    // Check if transaction was successful
    if (tx.meta?.err) {
      return new Response(JSON.stringify({ error: "Transaction failed on-chain" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the payment: check for SOL transfer to platform wallet
    const instructions = tx.transaction?.message?.instructions || [];
    let paymentVerified = false;

    for (const ix of instructions) {
      if (ix.parsed?.type === "transfer" && ix.program === "system") {
        const { destination, lamports } = ix.parsed.info;
        if (
          destination === PLATFORM_WALLET &&
          Number(lamports) >= REQUIRED_AMOUNT_SOL * LAMPORTS_PER_SOL * 0.99 // 1% tolerance for fees
        ) {
          paymentVerified = true;
          break;
        }
      }
    }

    if (!paymentVerified) {
      return new Response(JSON.stringify({ error: "Payment not verified. Must send 0.3 SOL to platform wallet." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payment verified - save token to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if tx_hash already used
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("tx_hash", tx_hash)
      .single();

    if (existingTx) {
      return new Response(JSON.stringify({ error: "Transaction already processed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create token record
    const { data: token, error: tokenError } = await supabase
      .from("tokens")
      .insert({
        name: token_data.name,
        symbol: token_data.symbol,
        supply: token_data.supply,
        decimals: token_data.decimals || 9,
        description: token_data.description || null,
        creator_wallet: token_data.creator_wallet,
        website: token_data.website || null,
        twitter: token_data.twitter || null,
        telegram: token_data.telegram || null,
      })
      .select()
      .single();

    if (tokenError) {
      console.error("Token creation error:", tokenError);
      return new Response(JSON.stringify({ error: "Failed to create token record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record transaction
    await supabase.from("transactions").insert({
      user_wallet: token_data.creator_wallet,
      type: "CREATE_TOKEN",
      amount: REQUIRED_AMOUNT_SOL,
      status: "confirmed",
      tx_hash,
      token_id: token.id,
    });

    // Upsert user
    await supabase.from("users").upsert(
      { wallet_address: token_data.creator_wallet },
      { onConflict: "wallet_address" }
    );

    return new Response(JSON.stringify({ success: true, token }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-payment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
