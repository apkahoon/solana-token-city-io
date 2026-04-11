import { useState, useEffect } from 'react';

export const Footer = () => {
  const [tps, setTps] = useState(3102);
  const [gas, setGas] = useState(0.00002);

  // Simulate live TPS updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTps(Math.floor(2800 + Math.random() * 800));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="border-t border-border/50 py-3 px-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-foreground transition-colors">Comparison</a>
          <a href="#" className="hover:text-foreground transition-colors">Blog</a>
          <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
        </div>
        <div className="flex items-center gap-4">
          <span>Gas: {gas.toFixed(5)} SOL</span>
          <span>TPS: {tps.toLocaleString()}</span>
        </div>
      </div>
    </footer>
  );
};
