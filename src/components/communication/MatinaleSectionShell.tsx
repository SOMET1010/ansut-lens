import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Inbox, RefreshCw, Search, LucideIcon } from 'lucide-react';

export type SectionStatus = 'loading' | 'error' | 'empty' | 'ready';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** className applied to the Card wrapper (border colors, etc.) */
  cardClassName?: string;
  /** Right-aligned badges/buttons (drill, count, level) */
  rightActions?: ReactNode;
  /** Extra header inline children (e.g. NiveauBadge) before rightActions */
  headerExtras?: ReactNode;
  status: SectionStatus;
  /** Used for empty-state and error messages */
  emptyHint?: string;
  errorMessage?: string;
  onRetry?: () => void;
  children?: ReactNode;
}

export function MatinaleSectionShell({
  icon: Icon,
  title,
  description,
  cardClassName = 'glass',
  rightActions,
  headerExtras,
  status,
  emptyHint = 'Aucune donnée disponible pour cette section sur la période sélectionnée.',
  errorMessage,
  onRetry,
  children,
}: Props) {
  return (
    <Card className={cardClassName}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <Icon className="h-4 w-4 text-primary" />
          {title}
          {headerExtras}
          {status === 'loading' && (
            <Badge variant="outline" className="ml-auto text-xs gap-1 border-primary/30 text-primary">
              <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Chargement
            </Badge>
          )}
          {status === 'error' && (
            <Badge variant="outline" className="ml-auto text-xs gap-1 border-destructive/40 text-destructive">
              <AlertCircle className="h-2.5 w-2.5" /> Erreur
            </Badge>
          )}
          {status === 'empty' && (
            <Badge variant="outline" className="ml-auto text-xs gap-1 text-muted-foreground">
              <Inbox className="h-2.5 w-2.5" /> Vide
            </Badge>
          )}
          {status === 'ready' && rightActions}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {status === 'loading' && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}
        {status === 'error' && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-destructive">Impossible de charger cette section</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {errorMessage || 'Une erreur est survenue côté backend. Réessayez ou ajustez la fenêtre de fraîcheur.'}
                </p>
                {onRetry && (
                  <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={onRetry}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Réessayer
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        {status === 'empty' && (
          <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center">
            <Inbox className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-60" />
            <p className="text-xs text-muted-foreground">{emptyHint}</p>
          </div>
        )}
        {status === 'ready' && children}
      </CardContent>
    </Card>
  );
}

export function DrillButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs gap-1 ml-auto"
      onClick={onClick}
    >
      <Search className="h-3 w-3" /> Détail
    </Button>
  );
}
