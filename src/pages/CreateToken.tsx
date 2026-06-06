import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, Upload, Coins, ArrowRight, Loader2, AlertCircle, Globe, Twitter, Send, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeText, sanitizeUrl, sanitizeHandle, FIELD_LIMITS } from '@/lib/sanitize';
import { ConfirmationModal } from '@/components/token/ConfirmationModal';
import { useAuth } from '@/contexts/AuthContext';

const PLATFORM_WALLET = 'AUudUn5v4HM2EtkfM9GXSqLBAGUV5CoMgbKPWFPVV2fS';
const FEE_SOL = 0.3;

type Step = 'form' | 'config' | 'payment' | 'creating' | 'success' | 'error';

interface CreatedToken {
  id: string;
  name: string;
  symbol: string;
  supply: number;
  mint_address?: string;
}

export default function CreateToken() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { user } = useAuth();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const navigate = useNavigate();
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
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be under 10MB');
        return;
      }
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  }, []);

  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Sign in before creating a token'); navigate('/auth'); return; }
    if (!connected) { setVisible(true); return; }
    setStep('config');
  };

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const handlePaymentClick = () => {
    setShowConfirmModal(true);
  };

  const handlePayment = async () => {
    setShowConfirmModal(false);
    if (!publicKey || !sendTransaction) return;

    try {
      setStep('creating');
      setErrorMessage('');

      // Upload logo to IPFS if provided
      let logoUrl: string | null = null;
      if (logo) {
        try {
          const ipfsForm = new FormData();
          ipfsForm.append('file', logo);
          const ipfsRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-ipfs`,
            {
              method: 'POST',
              headers: {
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: ipfsForm,
            }
          );
          if (ipfsRes.ok) {
            const ipfsData = await ipfsRes.json();
            logoUrl = ipfsData.ipfsUrl;
          }
        } catch (e) {
          console.warn('IPFS upload failed, continuing without logo:', e);
        }
      }

      // Create the SOL transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(PLATFORM_WALLET),
          lamports: Math.floor(FEE_SOL * LAMPORTS_PER_SOL),
        })
      );

      const signature = await sendTransaction(transaction, connection);
      setTxSignature(signature);

      // Poll signature status over HTTP (WebSocket subscriptions don't work through our HTTPS proxy).
      // Wait up to ~60s for the network to confirm the transfer.
      const confirmed = await (async () => {
        for (let i = 0; i < 30; i++) {
          try {
            const { value } = await connection.getSignatureStatuses([signature]);
            const status = value?.[0];
            if (status?.err) throw new Error('Transaction failed on-chain');
            if (status && (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized')) {
              return true;
            }
          } catch (e) {
            if ((e as Error).message?.includes('on-chain')) throw e;
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
        return false;
      })();

      if (!confirmed) {
        throw new Error('Transaction confirmation timed out. Your SOL was sent — please contact support with the TX hash.');
      }

      // Sanitize all inputs before sending
      const sanitizedData = {
        name: sanitizeText(form.name).slice(0, FIELD_LIMITS.name),
        symbol: sanitizeText(form.symbol).slice(0, FIELD_LIMITS.symbol).toUpperCase(),
        supply: Number(form.supply),
        decimals: Number(form.decimals),
        description: sanitizeText(form.description).slice(0, FIELD_LIMITS.description),
        creator_wallet: publicKey.toBase58(),
        website: sanitizeUrl(form.website) || null,
        twitter: sanitizeHandle(form.twitter) || null,
        telegram: sanitizeHandle(form.telegram) || null,
        logo_url: logoUrl,
      };

      // Verify payment on backend, retrying while the RPC node indexes the new tx.
      const verifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`;
      let result: any = null;
      let lastErr = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        const verifyRes = await fetch(verifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ tx_hash: signature, token_data: sanitizedData }),
        });
        result = await verifyRes.json();
        if (verifyRes.ok) break;
        lastErr = result?.error || 'Payment verification failed';
        if (!/not found|confirming/i.test(lastErr)) throw new Error(lastErr);
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!result?.success) throw new Error(lastErr || 'Payment verification failed');

      setCreatedToken(result.token);
      setStep('success');

      // Console log for verification
      console.log('✅ Token created successfully!');
      console.log('TX Signature:', signature);
      console.log('Fee Paid:', FEE_SOL, 'SOL');
      console.log('Recipient Wallet:', PLATFORM_WALLET);
      console.log('Token ID:', result.token.id);

      toast.success('Token launched successfully! 🚀');
    } catch (err: any) {
      console.error('Payment error:', err);
      let msg = 'Payment failed. Please try again.';
      if (err.message?.includes('User rejected')) msg = 'Transaction cancelled by user. No SOL was spent.';
      else if (err.message?.includes('insufficient')) msg = 'Insufficient SOL balance. You need at least 0.3 SOL.';
      else if (err.message?.includes('timeout') || err.message?.includes('Timeout')) msg = 'Transaction timed out. Please check your wallet and try again.';
      else if (err.message) msg = err.message;

      setErrorMessage(msg);
      setStep('error');
      toast.error(msg);
    }
  };

  const handleRetry = () => {
    setErrorMessage('');
    setStep('payment');
  };

  const shareOnTwitter = () => {
    const text = `I just launched $${createdToken?.symbol} on @SolForge! 🚀\n\nCheck it out: ${window.location.origin}/token/${createdToken?.id}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const steps = [
    { label: 'Basic Info', num: 1 },
    { label: 'Configuration', num: 2 },
    { label: 'Payment', num: 3 },
  ];
  const stepIndex = ['form', 'config', 'payment', 'creating', 'error'].indexOf(
    step === 'success' ? 'creating' : step
  );

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">SolForge Token Creator</h1>
          <p className="text-muted-foreground text-sm">Mint fully compliant SPL tokens on Solana Devnet with zero coding.</p>
        </motion.div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {steps.map((s, i) => {
            const isActive = i <= stepIndex || step === 'success';
            return (
              <div key={s.label} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isActive ? 'bg-gradient-to-br from-primary to-secondary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>{s.num}</div>
                <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
                {i < steps.length - 1 && <ArrowRight className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-border'}`} />}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div>
            {step === 'form' && (
              <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleBasicSubmit} className="space-y-6">
                <div className="glass p-4 sm:p-6">
                  <h2 className="font-display font-semibold text-lg mb-1">Token Identity</h2>
                  <p className="text-xs text-muted-foreground mb-5">Basic information visible on-chain.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Token Name ({form.name.length}/{FIELD_LIMITS.name})</label>
                      <input type="text" required maxLength={FIELD_LIMITS.name} placeholder="e.g. Solana Gem" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Symbol ({form.symbol.length}/{FIELD_LIMITS.symbol})</label>
                      <input type="text" required maxLength={FIELD_LIMITS.symbol} placeholder="e.g. GEM" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Token Image (max 10MB)</label>
                    <label className="cursor-pointer block">
                      <div className="w-full h-40 rounded-lg bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-primary/50 transition-colors">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Token logo" className="h-full object-contain rounded-lg" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-secondary mb-2" />
                            <span className="text-sm text-muted-foreground">Click to upload image</span>
                          </>
                        )}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </label>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Description ({form.description.length}/{FIELD_LIMITS.description})</label>
                    <textarea rows={3} maxLength={FIELD_LIMITS.description} placeholder="Project description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none" />
                  </div>
                </div>

                <div className="glass p-4 sm:p-6">
                  <h2 className="font-display font-semibold text-lg mb-1">Metadata Extensions</h2>
                  <p className="text-xs text-muted-foreground mb-5">Social links for DexScreener.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="relative">
                      <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input type="url" placeholder="Website" maxLength={FIELD_LIMITS.website} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                    <div className="relative">
                      <Twitter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input type="text" placeholder="Twitter / X" maxLength={FIELD_LIMITS.twitter} value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                    <div className="relative">
                      <Send className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input type="text" placeholder="Telegram" maxLength={FIELD_LIMITS.telegram} value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold">
                  {!user ? 'Sign in to Continue' : connected ? <>Next <ArrowRight className="w-4 h-4" /></> : <>Connect Wallet to Continue</>}
                </button>
              </motion.form>
            )}

            {step === 'config' && (
              <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleConfigSubmit} className="glass p-4 sm:p-6 space-y-5">
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
                  <Coins className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <div className="text-sm font-medium">Launch Fee: {FEE_SOL} SOL</div>
                    <div className="text-xs text-muted-foreground">Includes token creation + metadata upload</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep('form')} className="flex-1 px-6 py-3 rounded-xl glass font-medium text-sm hover:bg-muted/80">Back</button>
                  <button type="submit" className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold">
                    Continue to Payment <ArrowRight className="w-4 h-4 inline ml-1" />
                  </button>
                </div>
              </motion.form>
            )}

            {step === 'payment' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-4 sm:p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
                  <Coins className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-display text-xl font-bold mb-2">Confirm Payment</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Send <span className="text-foreground font-semibold">{FEE_SOL} SOL</span> to create your token
                </p>
                <div className="glass p-4 mb-6 text-left space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Token:</span> <span>{form.name} ({form.symbol})</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Supply:</span> <span>{Number(form.supply).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fee:</span> <span className="text-primary font-semibold">{FEE_SOL} SOL</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Receiver:</span> <span className="font-mono text-xs">{PLATFORM_WALLET.slice(0, 6)}...{PLATFORM_WALLET.slice(-4)}</span></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep('config')} className="flex-1 px-4 py-3 rounded-xl glass text-sm font-medium hover:bg-muted/80">Back</button>
                  <button onClick={handlePaymentClick} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-primary text-primary-foreground font-semibold">
                    <Rocket className="w-5 h-5" /> Pay & Launch
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'creating' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6 text-center">
                <Loader2 className="w-12 h-12 text-primary mx-auto mb-6 animate-spin" />
                <h2 className="font-display text-xl font-bold mb-2">Creating Your Token...</h2>
                <p className="text-muted-foreground text-sm">Verifying payment & deploying on Solana</p>
                <div className="mt-6 space-y-2 text-left text-sm">
                  {['Verifying SOL payment...', 'Uploading metadata to IPFS...', 'Creating SPL token record...'].map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> {s}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'error' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6 text-center">
                <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
                <h2 className="font-display text-xl font-bold mb-2">Transaction Failed</h2>
                <p className="text-muted-foreground text-sm mb-4">{errorMessage}</p>
                {txSignature && (
                  <p className="text-xs text-muted-foreground mb-4">
                    TX: <a href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">{txSignature.slice(0, 16)}...</a>
                  </p>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setStep('form')} className="flex-1 px-4 py-3 rounded-xl glass text-sm font-medium hover:bg-muted/80">Start Over</button>
                  <button onClick={handleRetry} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold">
                    <RotateCcw className="w-4 h-4" /> Retry Payment
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'success' && createdToken && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-6">
                  <Rocket className="w-8 h-8 text-neon-green" />
                </div>
                <h2 className="font-display text-2xl font-bold mb-2">Token Launched! 🚀</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  <span className="text-foreground font-semibold">{createdToken.name}</span> ({createdToken.symbol}) is now live on Solana
                </p>

                <div className="glass p-4 mb-6 text-left space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Token:</span> <span>{createdToken.name} ({createdToken.symbol})</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Supply:</span> <span>{Number(createdToken.supply).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fee Paid:</span> <span className="text-neon-green font-semibold">{FEE_SOL} SOL ✓</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Recipient:</span> <span className="font-mono text-xs">{PLATFORM_WALLET.slice(0, 6)}...{PLATFORM_WALLET.slice(-4)}</span></div>
                  {txSignature && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">TX:</span>
                      <a href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono text-xs">{txSignature.slice(0, 20)}...</a>
                    </div>
                  )}
                  {createdToken.mint_address && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Mint:</span>
                      <button onClick={() => { navigator.clipboard.writeText(createdToken.mint_address!); toast.success('Copied!'); }} className="text-primary hover:underline font-mono text-xs">{createdToken.mint_address.slice(0, 20)}... 📋</button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={shareOnTwitter} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass text-sm font-medium hover:bg-muted/80">
                    <Twitter className="w-4 h-4" /> Share on Twitter
                  </button>
                  <button onClick={() => navigate(`/token/${createdToken.id}`)} className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold">
                    View Token Page
                  </button>
                </div>

                <div className="mt-4">
                  <button onClick={() => { setStep('form'); setForm({ name: '', symbol: '', supply: '1000000000', decimals: '9', description: '', website: '', twitter: '', telegram: '' }); setLogo(null); setLogoPreview(null); setTxSignature(null); setCreatedToken(null); }} className="text-xs text-muted-foreground hover:text-foreground">
                    Create Another Token →
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Live Token Preview Card */}
          <div className="hidden lg:block">
            <div className="sticky top-8">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass p-6 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-dashed border-border flex items-center justify-center mb-4 overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-display text-lg font-bold mb-1">{form.name || 'Token Name'}</h3>
                <div className="inline-flex px-3 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground mb-6">{form.symbol || 'SYMBOL'}</div>
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

              <div className="mt-4 glass p-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <strong className="text-foreground">How it works:</strong> Fill in details → Pay {FEE_SOL} SOL → Token is created and minted to your wallet.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        open={showConfirmModal}
        onConfirm={handlePayment}
        onCancel={() => setShowConfirmModal(false)}
        tokenName={form.name}
        tokenSymbol={form.symbol}
        feeSol={FEE_SOL}
        recipientWallet={PLATFORM_WALLET}
      />
    </div>
  );
}
