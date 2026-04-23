# 🌆 Solana Token City

> Launch, trade, and grow Solana tokens — all from one beautiful dashboard.

Solana Token City is a full-stack Web3 platform for creating SPL tokens, adding liquidity on Raydium, swapping, boosting visibility, and tracking trending tokens on Solana **Mainnet**. Built with React, Supabase, and the Solana web3.js / Raydium SDKs.

**🔗 Live demo:** https://solana-token-city-io.lovable.app

---

## 📸 Screenshots

> Add your screenshots to a `/docs/screenshots/` folder and they will render below.

| Landing | Create Token | Trending |
|---|---|---|
| ![Landing](docs/screenshots/landing.png) | ![Create](docs/screenshots/create.png) | ![Trending](docs/screenshots/trending.png) |

---

## ✨ Features

- 🪙 **Token Creation** – Mint SPL tokens with logo, metadata, and social links (multi-step wizard with live preview)
- 💧 **Liquidity Manager** – Create and lock Raydium liquidity pools
- 🔄 **Token Swap** – Swap SOL ↔ any listed token via Raydium
- 🔥 **Security Burn** – Burn LP tokens / supply for trust signals
- 📈 **Trending Algorithm** – Volume + buys + boost weighted ranking
- 🚀 **Boost System** – Pay to feature your token
- 👤 **User Portfolio** – Track your created tokens & transactions
- 🛡️ **Admin Portal** – Moderate flagged tokens & monitor transactions
- 💬 **AI Support Chatbot** – Hybrid FAQ + Lovable AI Gateway
- 🔐 **Auth** – Email/password + Google OAuth + Phantom wallet
- 🎨 **Dark Glassmorphism UI** – Neon gradients, Framer Motion animations

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Animations | Framer Motion |
| Blockchain | `@solana/web3.js`, `@solana/spl-token`, Raydium SDK |
| Wallet | Phantom (via `@solana/wallet-adapter`) |
| Backend | Supabase (Postgres, Auth, RLS, Edge Functions) |
| Storage | Pinata (IPFS) for token metadata/logos |
| AI | Lovable AI Gateway (Gemini / GPT models) |
| Security | Cloudflare Turnstile, XSS sanitization, RLS |
| Monitoring | Sentry |

---

## 🚀 Getting Started Locally

### Prerequisites

- **Node.js** 18+ (or **Bun** 1.0+)
- **Phantom Wallet** browser extension
- A **Supabase** project (free tier works)
- A **Pinata** account for IPFS uploads
- A funded Solana wallet (Mainnet SOL for real tx, or use Devnet for testing)

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/solana-token-city.git
cd solana-token-city
```

### 2. Install dependencies

```bash
npm install
# or
bun install
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Required variables in `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

### 4. Set up the database

Run the SQL migrations in `supabase/migrations/` against your Supabase project (via the Supabase Dashboard → SQL Editor, or the Supabase CLI):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 5. Configure Edge Function secrets

In your Supabase Dashboard → Project Settings → Edge Functions → Secrets, add:

| Secret | Purpose |
|---|---|
| `PINATA_JWT` | IPFS uploads for token metadata |
| `SOLANA_RPC_URL` | Mainnet RPC (Helius / QuickNode recommended) |
| `PLATFORM_WALLET` | Wallet that receives platform fees |
| `LOVABLE_API_KEY` | AI chatbot (auto-provisioned on Lovable) |
| `TURNSTILE_SECRET_KEY` | Cloudflare bot protection |

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## 📜 Available Scripts

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview prod build locally
npm run test      # Run Vitest tests
npm run lint      # ESLint
```

---

## 🗂️ Project Structure

```
src/
├── components/        # Reusable UI (layout, wallet, chatbot, ui/)
├── contexts/          # AuthContext, WalletContext
├── hooks/             # useUserRole, use-mobile, use-toast
├── integrations/      # Supabase + Lovable client
├── lib/               # sanitize, utils
├── pages/             # Route components (Landing, CreateToken, Swap, Admin, …)
└── test/              # Vitest setup & examples

supabase/
├── functions/         # Edge functions (chatbot, rpc-proxy, upload-to-ipfs, verify-payment)
└── migrations/        # SQL schema migrations
```

---

## 🌐 Deployment

### Option A — Lovable (one click)

The project is built on [Lovable](https://lovable.dev). Open the project and click **Publish** → live in seconds at `*.lovable.app`. Custom domains supported.

### Option B — Vercel / Netlify

1. Push the repo to GitHub
2. Import the repo into Vercel or Netlify
3. Set the env vars from step 3 above
4. Deploy — framework preset: **Vite**

> ⚠️ Edge functions live in Supabase, so they deploy automatically via `supabase functions deploy <name>` and are independent of your frontend host.

---

## 🔒 Security Notes

- All sensitive operations (payment verification, RPC calls, IPFS uploads) run **server-side** in Supabase Edge Functions
- RLS is enabled on every table; roles live in a separate `user_roles` table to prevent privilege escalation
- The admin portal is gated by the `has_role(uid, 'admin')` SQL function, **never** by client state
- Phantom wallet may show a domain warning on fresh `*.lovable.app` subdomains — use a custom domain for production

---

## 🤝 Contributing

PRs welcome! Please:

1. Fork & branch from `main`
2. Run `npm run lint && npm run test` before opening a PR
3. Keep commits scoped and descriptive

---

## 📄 License

MIT — do whatever you like, just don't blame us if your memecoin moons or rugs. 🚀

---

## 🙏 Credits

- UI built with [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- Powered by [Solana](https://solana.com/) + [Raydium](https://raydium.io/)
- Backend by [Supabase](https://supabase.com/) (via [Lovable Cloud](https://lovable.dev/))
- AI by [Lovable AI Gateway](https://docs.lovable.dev/features/ai)
