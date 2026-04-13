import { motion } from 'framer-motion';

export default function Terms() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold mb-6">Terms of Service</h1>
          <div className="glass p-8 prose prose-invert prose-sm max-w-none">
            <p className="text-muted-foreground"><em>Last updated: April 13, 2026</em></p>

            <h2 className="font-display text-lg font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">By accessing or using Solana Token City ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>

            <h2 className="font-display text-lg font-semibold mt-6 mb-2">2. Platform Description</h2>
            <p className="text-muted-foreground">Solana Token City provides tools for creating SPL tokens on the Solana blockchain. We do not provide financial advice, investment recommendations, or custodial services.</p>

            <h2 className="font-display text-lg font-semibold mt-6 mb-2">3. Eligibility</h2>
            <p className="text-muted-foreground">You must be at least 18 years old and legally able to enter into contracts in your jurisdiction to use this Platform.</p>

            <h2 className="font-display text-lg font-semibold mt-6 mb-2">4. Fees</h2>
            <p className="text-muted-foreground">Token creation requires a non-refundable platform fee of 0.3 SOL. Additional Solana network fees may apply. All fees are subject to change with notice.</p>

            <h2 className="font-display text-lg font-semibold mt-6 mb-2">5. User Responsibilities</h2>
            <p className="text-muted-foreground">You are solely responsible for your wallet security, private keys, and all tokens you create. You agree not to use the Platform for illegal activities, fraud, or to harm others.</p>

            <h2 className="font-display text-lg font-semibold mt-6 mb-2">6. No Warranty</h2>
            <p className="text-muted-foreground">The Platform is provided "as is" without warranties of any kind. We do not guarantee uptime, accuracy, or fitness for any particular purpose.</p>

            <h2 className="font-display text-lg font-semibold mt-6 mb-2">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">In no event shall Solana Token City be liable for any indirect, incidental, or consequential damages arising from your use of the Platform.</p>

            <h2 className="font-display text-lg font-semibold mt-6 mb-2">8. Contact</h2>
            <p className="text-muted-foreground">For questions about these terms, contact us through our official channels.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
