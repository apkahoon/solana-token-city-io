import { motion } from 'framer-motion';

export default function Privacy() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold mb-6">Privacy Policy</h1>
          <div className="glass p-8 prose prose-invert prose-sm max-w-none">
            <p className="text-muted-foreground"><em>Last updated: April 13, 2026</em></p>

            <h2 className="font-display text-lg font-semibold mt-6 mb-2">1. Information We Collect</h2>
            <p className="text-muted-foreground">We collect your email address (if you sign up), wallet address (when you connect), and token creation data. We do not collect private keys or seed phrases.</p>

            <h2 className="font-display text-lg font-semibold mt-6 mb-2">2. How We Use Information</h2>
            <p className="text-muted-foreground">Your information is used to provide Platform services, process transactions, display your tokens, and communicate important updates.</p>

            <h2 className="font-display text-lg font-semibold mt-6 mb-2">3. Data Storage</h2>
            <p className="text-muted-foreground">Data is stored securely using industry-standard encryption. Blockchain data (wallet addresses, transactions) is inherently public.</p>

            <h2 className="font-display text-lg font-semibold mt-6 mb-2">4. Third-Party Services</h2>
            <p className="text-muted-foreground">We use Solana blockchain for transactions, IPFS for metadata storage, and error monitoring services. Each has their own privacy policy.</p>

            <h2 className="font-display text-lg font-semibold mt-6 mb-2">5. Your Rights</h2>
            <p className="text-muted-foreground">You may request deletion of your account and associated data. Blockchain data cannot be deleted as it is immutable.</p>

            <h2 className="font-display text-lg font-semibold mt-6 mb-2">6. Contact</h2>
            <p className="text-muted-foreground">For privacy-related inquiries, contact us through our official channels.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
