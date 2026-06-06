import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App render failed", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-background text-foreground">
        <section className="glass max-w-md p-6 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold">SolForge couldn’t load</h1>
          <p className="text-sm text-muted-foreground">
            Refresh the page. If it keeps happening, open another SolForge page from the menu.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-primary-foreground font-semibold neon-glow"
          >
            Refresh
          </button>
        </section>
      </main>
    );
  }
}