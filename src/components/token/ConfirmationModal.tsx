import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Coins } from 'lucide-react';

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  tokenName: string;
  tokenSymbol: string;
  feeSol: number;
  recipientWallet: string;
}

export function ConfirmationModal({ open, onConfirm, onCancel, tokenName, tokenSymbol, feeSol, recipientWallet }: Props) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onCancel}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass p-6 max-w-md w-full relative z-10"
        >
          <button onClick={onCancel} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-accent" />
            </div>
            <h2 className="font-display text-lg font-bold">Confirm Transaction</h2>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            You are about to sign a transaction. Please review the details carefully.
          </p>

          <div className="glass p-4 space-y-2 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Action</span>
              <span>Create Token</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Token</span>
              <span>{tokenName} ({tokenSymbol})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fee</span>
              <span className="text-accent font-semibold">{feeSol} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipient</span>
              <span className="font-mono text-xs">{recipientWallet.slice(0, 6)}...{recipientWallet.slice(-4)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl glass text-sm font-medium hover:bg-muted/80">
              Cancel
            </button>
            <button onClick={onConfirm} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-accent to-primary text-primary-foreground text-sm font-semibold">
              <Coins className="w-4 h-4" /> Confirm & Pay
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
