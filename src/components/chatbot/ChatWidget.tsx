import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };

const FAQ: Record<string, string> = {
  'how to create a token': 'To create a token:\n1. Go to **Token Creator** from the sidebar\n2. Fill in your token name, symbol, and supply\n3. Upload a logo and add social links\n4. Pay the **0.3 SOL** launch fee\n5. Your token will be minted on Solana!\n\nYou need a **Phantom wallet** with at least 0.3 SOL.',
  'what is liquidity': 'Liquidity is the pool of tokens paired with SOL that enables trading. After creating your token, you can **Add Liquidity** via the Liquidity Manager to make your token tradeable on DEXs like Raydium.',
  'how much does it cost': 'Creating a token costs **0.3 SOL**. This covers:\n- SPL token creation\n- Metadata upload\n- On-chain deployment\n\nAdditional costs apply for adding liquidity and boosting.',
  'what is boosting': 'Boosting increases your token\'s **trending score**, giving it more visibility on the Trending page. Pay SOL to boost your token and attract more buyers.',
  'how to connect wallet': 'Click the **Connect Wallet** button in the sidebar. We support **Phantom wallet**. Make sure you have the Phantom browser extension installed.',
  'what is burn': 'Burning tokens permanently removes them from circulation, reducing supply and potentially increasing value. Use the **Security & Burn** page to burn tokens or revoke mint authority.',
  'is it safe': 'Yes! All payments are verified on-chain before tokens are created. We use **Solana\'s SPL Token program** for secure token creation. Your wallet keys never leave your device.',
};

function findFaqAnswer(query: string): string | null {
  const q = query.toLowerCase();
  for (const [key, answer] of Object.entries(FAQ)) {
    if (q.includes(key) || key.split(' ').filter(w => w.length > 3).every(w => q.includes(w))) {
      return answer;
    }
  }
  return null;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot`;

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Hey! 👋 I\'m your **SolForge** assistant. Ask me anything about creating tokens, adding liquidity, or using the platform!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Check FAQ first
    const faqAnswer = findFaqAnswer(text);
    if (faqAnswer) {
      setMessages(prev => [...prev, { role: 'assistant', content: faqAnswer }]);
      setLoading(false);
      return;
    }

    // AI fallback
    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg].slice(-10) }),
      });

      if (!resp.ok) {
        throw new Error('AI unavailable');
      }

      // Stream response
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant' && prev.length > 1) {
                    return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                  }
                  return [...prev, { role: 'assistant', content: assistantContent }];
                });
              }
            } catch { /* partial JSON */ }
          }
        }
      }

      if (!assistantContent) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t process that. Try asking about creating tokens, liquidity, or boosting!' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I\'m having trouble connecting right now. Here are some things I can help with:\n- How to create a token\n- What is liquidity\n- How much does it cost\n- How to connect wallet' }]);
    }

    setLoading(false);
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue text-primary-foreground flex items-center justify-center neon-glow hover:shadow-[0_0_30px_hsl(270_80%_60%/0.5)] transition-shadow"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-6rem)] glass-strong flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-sm font-semibold">STC Assistant</div>
                  <div className="text-xs text-neon-green flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" /> Online
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-neon-purple/20 text-foreground'
                      : 'bg-muted text-foreground'
                  }`}>
                    <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_ol]:m-0 [&_ul]:m-0 [&_li]:m-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3 h-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center shrink-0">
                    <Bot className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <Loader2 className="w-4 h-4 text-neon-purple animate-spin" />
                </div>
              )}
            </div>

            {/* Quick actions */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {['How to create a token?', 'How much does it cost?', 'What is liquidity?'].map(q => (
                  <button key={q} onClick={() => { setInput(q); }} className="px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border/50">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button type="submit" disabled={loading || !input.trim()} className="p-2 rounded-lg bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
