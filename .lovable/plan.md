# SolForge On-Chain Marketplace

## What users will get
- A dedicated Marketplace page for verified SolForge tokens, separate from the existing live-pool Market page.
- On-chain order-book markets for SolForge tokens quoted in SOL, using OpenBook v2.
- Market creation for eligible tokens, a live bids/asks view, and wallet-approved limit buy/sell orders with visible price, quantity, fees, and order status.
- Open-order cancellation, fill/transaction links, and warnings when a market has no opposing orders or shallow liquidity.

## Implementation
- Add OpenBook v2 client support compatible with the project's Solana wallet and RPC proxy; validate the deployed program/network and SDK transaction flow before enabling mainnet actions.
- Add a dedicated route and navigation entry; list only non-flagged tokens with a confirmed on-chain mint.
- Persist a verified token-mint-to-market mapping so investors can discover each order book. Apply least-privilege access and confirm the market's on-chain mints before displaying it.
- Read bids, asks, open orders, and fills from the order-book program. Require explicit Phantom approval for market creation, order placement, and cancellation; show signatures and explorer links.
- Keep existing Raydium/Jupiter liquidity and Swap routes unchanged. Do not represent AMM liquidity as order-book depth.

## Technical notes
- Quote asset defaults to wrapped SOL, matching SolForge's current token pools.
- A real order book requires orders from counterparties; creating a market alone does not guarantee immediate trades or buyers.
- No wallet signing, mainnet transaction, liquidity, or fills can be completed by the assistant. Verify program compatibility and test the UI before presenting anything as live; report wallet-dependent checks clearly.
