import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { Rocket, Upload, Coins, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type Step = 'form' | 'payment' | 'creating' | 'success';

export default function CreateToken() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState({
    name: '',
    symbol: '',
    supply: '1000000000',
    decimals: '9',
    description: '',
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) {
      setVisible(true);
      return;
    }
    setStep('payment');
  };

  const handlePayment = async () => {
    setStep('creating');
    // Simulate token creation
    await new Promise((r) => setTimeout(r, 3000));
    setStep('success');
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
            <span className="gradient-text">Create Your Token</span>
          </h1>
          <p className="text-muted-foreground">Launch your meme coin on Solana in seconds</p>
        </motion.div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {['Details', 'Payment', 'Launch'].map((label, i) => {
            const stepIndex = ['form', 'payment', 'creating'].indexOf(step === 'success' ? 'creating' : step);
            const isActive = i <= stepIndex || step === 'success';
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isActive ? 'bg-gradient-to-br from-neon-purple to-neon-blue text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                {i < 2 && <div className={`w-8 h-px ${isActive ? 'bg-neon-purple' : 'bg-border'}`} />}
              </div>
            );
          })}
        </div>

        {step === 'form' && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleSubmit}
            className="glass p-6 sm:p-8 space-y-5"
          >
            {/* Logo upload */}
            <div className="flex justify-center">
              <label className="cursor-pointer group">
                <div className="w-24 h-24 rounded-2xl glass flex items-center justify-center overflow-hidden group-hover:neon-glow transition-shadow">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Token logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                      <span className="text-xs text-muted-foreground">Logo</span>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Token Name</label>
                <input
                  type="text"
                  required
                  maxLength={32}
                  placeholder="e.g. Doge Moon"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Symbol</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="e.g. DMOON"
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Total Supply</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="1000000000"
                  value={form.supply}
                  onChange={(e) => setForm({ ...form, supply: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Decimals</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={18}
                  value={form.decimals}
                  onChange={(e) => setForm({ ...form, decimals: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Description</label>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Describe your token..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
              />
            </div>

            <div className="glass p-4 flex items-center gap-3">
              <Coins className="w-5 h-5 text-neon-purple shrink-0" />
              <div>
                <div className="text-sm font-medium">Launch Fee: 0.3 SOL</div>
                <div className="text-xs text-muted-foreground">Includes token creation + metadata upload</div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow hover:shadow-[0_0_40px_hsl(270_80%_60%/0.5)] transition-shadow"
            >
              {connected ? (
                <>Continue to Payment <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Connect Wallet to Continue</>
              )}
            </button>
          </motion.form>
        )}

        {step === 'payment' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6 sm:p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 flex items-center justify-center mx-auto mb-6">
              <Coins className="w-8 h-8 text-neon-purple" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Confirm Payment</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Send <span className="text-foreground font-semibold">0.3 SOL</span> to create your token
            </p>
            <div className="glass p-4 mb-6 text-left space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Token:</span> <span>{form.name} ({form.symbol})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Supply:</span> <span>{Number(form.supply).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fee:</span> <span className="text-neon-purple font-semibold">0.3 SOL</span></div>
            </div>
            <button
              onClick={handlePayment}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-semibold neon-glow hover:shadow-[0_0_40px_hsl(330_80%_60%/0.5)] transition-shadow"
            >
              <Rocket className="w-5 h-5" />
              Pay & Launch Token
            </button>
          </motion.div>
        )}

        {step === 'creating' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6 sm:p-8 text-center">
            <Loader2 className="w-12 h-12 text-neon-purple mx-auto mb-6 animate-spin" />
            <h2 className="font-display text-xl font-bold mb-2">Creating Your Token...</h2>
            <p className="text-muted-foreground text-sm">Verifying payment & deploying on Solana</p>
            <div className="mt-6 space-y-2 text-left text-sm">
              {['Verifying SOL payment...', 'Creating SPL token...', 'Uploading metadata to IPFS...'].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {s}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-6 sm:p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-neon-green mx-auto mb-6" />
            <h2 className="font-display text-2xl font-bold mb-2">Token Launched! 🚀</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your token <span className="text-foreground font-semibold">{form.name}</span> is now live on Solana
            </p>
            <div className="glass p-4 mb-6 text-left space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Mint:</span> <span className="font-mono text-xs">Demo...Address</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Supply:</span> <span>{Number(form.supply).toLocaleString()}</span></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { setStep('form'); setForm({ name: '', symbol: '', supply: '1000000000', decimals: '9', description: '' }); setLogo(null); setLogoPreview(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl glass text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                Create Another
              </button>
              <button className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground text-sm font-semibold neon-glow">
                Add Liquidity
              </button>
            </div>
          </motion.div>
        )}

        {/* Info card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 glass p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-4 h-4 text-neon-purple shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <strong className="text-foreground">How it works:</strong> Fill in your token details → pay 0.3 SOL → we verify the payment on-chain → your SPL token is created and minted to your wallet.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
