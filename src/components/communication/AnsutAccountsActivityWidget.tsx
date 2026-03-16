import React from 'react';
import { Linkedin, Twitter, Globe, Facebook, RefreshCw, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAnsutAccountsActivity, type AccountActivity } from '@/hooks/useAnsutAccountsActivity';

const platformIcons: Record<string, React.ElementType> = {
  linkedin: Linkedin,
  facebook: Facebook,
  twitter: Twitter,
  x: Twitter,
  site_web: Globe,
};

const platformColors: Record<string, string> = {
  linkedin: 'text-blue-600',
  facebook: 'text-blue-500',
  twitter: 'text-foreground',
  x: 'text-foreground',
  site_web: 'text-primary',
};

function AccountRow({ account }: { account: AccountActivity }) {
  const Icon = platformIcons[account.plateforme] || Globe;
  const color = platformColors[account.plateforme] || 'text-primary';
  const hasActivity = account.publications_24h > 0;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
      <div className={`p-2 rounded-lg bg-background ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{account.nom}</p>
          {account.url_profil && (
            <a href={account.url_profil} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
            </a>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          @{account.identifiant} · {account.plateforme}
        </p>
      </div>
      <div className="text-right shrink-0">
        {hasActivity ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {account.publications_24h} pub{account.publications_24h > 1 ? 's' : ''}
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            0 publication
          </Badge>
        )}
        {account.derniere_publication && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Dernière : {formatDistanceToNow(new Date(account.derniere_publication), { addSuffix: true, locale: fr })}
          </p>
        )}
      </div>
    </div>
  );
}

export function AnsutAccountsActivityWidget() {
  const { data, isLoading, refetch } = useAnsutAccountsActivity();
  const [collecting, setCollecting] = React.useState(false);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      const { error } = await supabase.functions.invoke('collecte-institutionnelle');
      if (error) throw error;
      toast.success('Collecte lancée — les données seront mises à jour sous peu');
      setTimeout(() => refetch(), 5000);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la collecte');
    } finally {
      setCollecting(false);
    }
  };

  const accounts = data?.accounts || [];
  const totalPubs = data?.totalPubs || 0;
  const inactiveCount = accounts.filter(a => a.publications_24h === 0).length;

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              📊 Activité des Comptes ANSUT
              <Badge variant="secondary" className="text-xs">
                24h
              </Badge>
            </CardTitle>
            {!isLoading && (
              <p className="text-xs text-muted-foreground mt-1">
                {totalPubs} publication{totalPubs !== 1 ? 's' : ''} aujourd'hui sur {accounts.length} compte{accounts.length !== 1 ? 's' : ''}
                {inactiveCount > 0 && (
                  <span className="text-destructive font-medium"> · {inactiveCount} inactif{inactiveCount > 1 ? 's' : ''}</span>
                )}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCollect}
            disabled={collecting}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${collecting ? 'animate-spin' : ''}`} />
            {collecting ? 'Collecte…' : 'Collecter'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            Aucun compte VIP actif configuré. Ajoutez des comptes dans la section Administration.
          </div>
        ) : (
          <div className="space-y-2">
            {/* Show inactive first for visibility */}
            {accounts
              .sort((a, b) => a.publications_24h - b.publications_24h)
              .map(account => (
                <AccountRow key={account.id} account={account} />
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
