import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
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
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-destructive/10 p-4">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
              </div>
              
              <h1 className="mb-2 text-2xl font-bold">
                Une erreur est survenue
              </h1>
              
              <p className="mb-6 text-muted-foreground">
                L'application a rencontré un problème inattendu. 
                Veuillez recharger la page ou revenir à l'accueil.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <pre className="mb-6 rounded bg-muted p-3 text-left text-xs text-destructive overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              )}
              
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={this.handleReload} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Recharger
                </Button>
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome} 
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Accueil
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
