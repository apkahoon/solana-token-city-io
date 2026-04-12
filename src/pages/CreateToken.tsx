import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion } from 'framer-motion';
import { Rocket, Upload, Coins, ArrowRight, Loader2, CheckCircle2, AlertCircle, Globe, Twitter, Send } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'form' | 'config' | 'payment' | 'creating' | 'success';

export default function CreateToken() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState({
    name: '',
    symbol: '',
    supply: '1000000000',
    decimals: '9',
    description: '',
    website: '',
    twitter: '',
    telegram: '',
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<any>(null);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  }, []);

  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) {
      setVisible(true);
      return;
    }
    setStep('config');
  };

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const handlePayment = async () => {
    if (!publicKey || !sendTransaction) return;
    
    const PLATFORM_WALLET = 'QLcWFBchUq7tzK91MqZBexQL7hVohATAgdsoGAGu5Ra';
    const FEE_SOL = 0.3;

    try {
      setStep('creating');

      // Create the SOL transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(PLATFORM_WALLET),
          lamports: Math.floor(FEE_SOL * LAMPORTS_PER_SOL),
        })
      );

      // Send transaction via Phantom
      const signature = await sendTransaction(transaction, connection);
      
      // Wait for confirmation
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        ...latestBlockhash,
      });

      // Verify payment on backend and create token record
      const verifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`;
      const verifyRes = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          tx_hash: signature,
          token_data: {
            name: form.name,
            symbol: form.symbol,
            supply: Number(form.supply),
            decimals: Number(form.decimals),
            description: form.description,
            creator_wallet: publicKey.toBase58(),
            website: form.website || null,
            twitter: form.twitter || null,
            telegram: form.telegram || null,
          },
        }),
      });

      const result = await verifyRes.json();
      
      if (!verifyRes.ok) {
        throw new Error(result.error || 'Payment verification failed');
      }

      setCreatedToken(result.token);
      setStep('success');
      toast.success('Token launched successfully! 🚀');
    } catch (err: any) {
      console.error('Payment error:', err);
      toast.error(err.message || 'Payment failed. Please try again.');
      setStep('payment');
    }
  };

  const steps = [
    { label: 'Basic Info', num: 1 },
    { label: 'Configuration', num: 2 },
    { label: 'Payment', num: 3 },
  ];
  const stepIndex = ['form', 'config', 'payment', 'creating'].indexOf(step === 'success' ? 'creating' : step);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Solana Token Creator</h1>
          <p className="text-muted-foreground text-sm">Mint fully compliant SPL tokens on Solana with zero coding.</p>
        </motion.div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => {
            const isActive = i <= stepIndex || step === 'success';
            return (
              <div key={s.label} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isActive ? 'bg-gradient-to-br from-neon-purple to-neon-blue text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {s.num}
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
                {i < steps.length - 1 && <ArrowRight className={`w-4 h-4 ${isActive ? 'text-neon-purple' : 'text-border'}`} />}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main form area */}
          <div>
            {step === 'form' && (
              <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleBasicSubmit} className="space-y-6">
                {/* Token Identity */}
                <div className="glass p-6">
                  <h2 className="font-display font-semibold text-lg mb-1">Token Identity</h2>
                  <p className="text-xs text-muted-foreground mb-5">Basic information visible on-chain.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Token Name</label>
                      <input type="text" required maxLength={32} placeholder="e.g. Solana Gem" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Symbol</label>
                      <input type="text" required maxLength={10} placeholder="e.g. GEM" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                  </div>

                  {/* Logo upload */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Token Image</label>
                    <label className="cursor-pointer block">
                      <div className="w-full h-40 rounded-lg bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-neon-purple/50 transition-colors">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Token logo" className="h-full object-contain rounded-lg" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-neon-blue mb-2" />
                            <span className="text-sm text-muted-foreground">Click to upload image</span>
                          </>
                        )}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Description</label>
                    <textarea rows={3} maxLength={500} placeholder="Project description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none" />
                  </div>
                </div>

                {/* Metadata Extensions */}
                <div className="glass p-6">
                  <h2 className="font-display font-semibold text-lg mb-1">Metadata Extensions</h2>
                  <p className="text-xs text-muted-foreground mb-5">Social links for DexScreener.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="relative">
                      <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input type="url" placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                    <div className="relative">
                      <Twitter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input type="text" placeholder="Twitter / X" value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                    <div className="relative">
                      <Send className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input type="text" placeholder="Telegram" value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow">
                  {connected ? <>Next <ArrowRight className="w-4 h-4" /></> : <>Connect Wallet to Continue</>}
                </button>
              </motion.form>
            )}

            {step === 'config' && (
              <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleConfigSubmit} className="glass p-6 space-y-5">
                <h2 className="font-display font-semibold text-lg mb-1">Configuration</h2>
                <p className="text-xs text-muted-foreground mb-4">Set your token parameters.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Total Supply</label>
                    <input type="number" required min={1} value={form.supply} onChange={(e) => setForm({ ...form, supply: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Decimals</label>
                    <input type="number" required min={0} max={18} value={form.decimals} onChange={(e) => setForm({ ...form, decimals: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                  </div>
                </div>

                <div className="glass p-4 flex items-center gap-3">
                  <Coins className="w-5 h-5 text-neon-purple shrink-0" />
                  <div>
                    <div className="text-sm font-medium">Launch Fee: 0.3 SOL</div>
                    <div className="text-xs text-muted-foreground">Includes token creation + metadata upload</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep('form')} className="flex-1 px-6 py-3 rounded-xl glass font-medium text-sm hover:bg-muted/80">Back</button>
                  <button type="submit" className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow">
                    Continue to Payment <ArrowRight className="w-4 h-4 inline ml-1" />
                  </button>
                </div>
              </motion.form>
            )}

            {step === 'payment' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6 text-center">
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
                  <div className="flex justify-between"><span className="text-muted-foreground">Receiver:</span> <span className="font-mono text-xs">QLcW...u5Ra</span></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep('config')} className="flex-1 px-4 py-3 rounded-xl glass text-sm font-medium hover:bg-muted/80">Back</button>
                  <button onClick={handlePayment} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-semibold neon-glow">
                    <Rocket className="w-5 h-5" /> Pay & Launch
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'creating' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6 text-center">
                <Loader2 className="w-12 h-12 text-neon-purple mx-auto mb-6 animate-spin" />
                <h2 className="font-display text-xl font-bold mb-2">Creating Your Token...</h2>
                <p className="text-muted-foreground text-sm">Verifying payment & deploying on Solana</p>
                <div className="mt-6 space-y-2 text-left text-sm">
                  {['Verifying SOL payment...', 'Creating SPL token...', 'Uploading metadata...'].map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> {s}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-6 text-center">
                <CheckCircle2 className="w-16 h-16 text-neon-green mx-auto mb-6" />
                <h2 className="font-display text-2xl font-bold mb-2">Token Launched! 🚀</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  <span className="text-foreground font-semibold">{form.name}</span> is now live on Solana
                </p>
                <div className="glass p-4 mb-6 text-left space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Token:</span> <span>{form.name} ({form.symbol})</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Supply:</span> <span>{Number(form.supply).toLocaleString()}</span></div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => { setStep('form'); setForm({ name: '', symbol: '', supply: '1000000000', decimals: '9', description: '', website: '', twitter: '', telegram: '' }); setLogo(null); setLogoPreview(null); }} className="flex-1 px-4 py-2.5 rounded-xl glass text-sm font-medium hover:bg-muted/80">
                    Create Another
                  </button>
                  <button onClick={() => window.location.href = '/liquidity'} className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground text-sm font-semibold neon-glow">
                    Add Liquidity
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Live Token Preview Card */}
          <div className="hidden lg:block">
            <div className="sticky top-8">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass p-6 text-center">
                {/* Token icon preview */}
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 border-2 border-dashed border-border flex items-center justify-center mb-4 overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>

                <h3 className="font-display text-lg font-bold mb-1">
                  {form.name || 'Token Name'}
                </h3>
                <div className="inline-flex px-3 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground mb-6">
                  {form.symbol || 'SYMBOL'}
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Supply</span>
                    <span className="font-medium">{form.supply ? Number(form.supply).toLocaleString() : '1,000,000,000'}</span>
                  </div>
                  <div className="border-t border-border/50" />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Authority</span>
                    <span className="text-neon-green text-xs font-medium">Active</span>
                  </div>
                  <div className="border-t border-border/50" />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Program</span>
                    <span className="font-medium">Token-2022</span>
                  </div>
                </div>
              </motion.div>

              {/* Info */}
              <div className="mt-4 glass p-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-neon-purple shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <strong className="text-foreground">How it works:</strong> Fill in details → Pay 0.3 SOL → Token is created and minted to your wallet.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
