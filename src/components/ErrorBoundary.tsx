import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Vangt render-fouten zodat één kapotte tab/pagina niet de hele app op een
 * blanco scherm zet. Toont een nette fallback + knop, en logt de fout zodat
 * de oorzaak zichtbaar is in de console.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Zichtbaar in de browserconsole voor diagnose.
    console.error("[ErrorBoundary] render-crash:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="retro-border bg-card max-w-md w-full p-6 text-center space-y-4">
            <h2 className="font-display text-xl font-bold">Er ging iets mis</h2>
            <p className="text-sm text-muted-foreground">
              Dit onderdeel kon niet geladen worden. Probeer het opnieuw of ververs de pagina.
            </p>
            <pre className="text-[10px] text-left text-rose-600 bg-rose-50 border border-rose-200 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => this.setState({ error: null })}
                className="px-3 py-1.5 text-sm font-medium border border-foreground/30 rounded hover:bg-secondary transition-colors"
              >
                Opnieuw proberen
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 text-sm font-medium border border-foreground/30 rounded hover:bg-secondary transition-colors"
              >
                Pagina verversen
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
