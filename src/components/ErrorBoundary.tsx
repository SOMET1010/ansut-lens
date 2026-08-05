import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Un chunk périmé (après redéploiement) doit déclencher une récupération, pas un mur d'erreur. */
function estErreurChunk(error: Error | null): boolean {
  const msg = String(error?.message || error?.name || '');
  return /dynamically imported module|Importing a module script failed|Failed to fetch|ChunkLoadError|Loading (chunk|CSS chunk)/i.test(
    msg,
  );
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Chunk périmé : on récupère en rechargeant une seule fois (garde anti-boucle
    // de 10 s), plutôt que de bloquer l'utilisateur sur une page qui n'est pas
    // réellement cassée. Les autres erreurs sont affichées normalement.
    if (estErreurChunk(error)) {
      const dernier = Number(sessionStorage.getItem('chunk-reload-ts') || 0);
      if (Date.now() - dernier > 10_000) {
        sessionStorage.setItem('chunk-reload-ts', String(Date.now()));
        window.location.reload();
        return;
      }
    }
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/ce-matin';
  };

  render() {
    if (this.state.hasError) {
      const chunk = estErreurChunk(this.state.error);
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted p-4">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-5 pt-6 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-attention-soft p-4">
                  <AlertTriangle className="h-10 w-10 text-attention" aria-hidden />
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-bold">
                  {chunk ? "Cet écran n'a pas pu se charger" : 'Une erreur est survenue'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {chunk
                    ? "Une nouvelle version vient probablement d'être déployée. Vos données ne sont pas modifiées — un simple rechargement suffit."
                    : "L'application a rencontré un problème inattendu. Vos données ne sont pas modifiées."}
                </p>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <pre className="max-h-32 overflow-auto rounded bg-muted p-3 text-left text-xs text-destructive">
                  {this.state.error.message}
                </pre>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={this.handleReload} className="gap-2">
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Réessayer
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
                  <Newspaper className="h-4 w-4" aria-hidden />
                  Revenir à Ce matin
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
