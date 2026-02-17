import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Send, Settings, Loader2, BarChart2, Newspaper, X, Plus, Clock, AlertTriangle } from 'lucide-react';
import { useWeeklyDigestConfig, useUpdateWeeklyDigest, useSendWeeklyDigest } from '@/hooks/useWeeklyDigest';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function WeeklyDigestConfig() {
  const { data: config, isLoading } = useWeeklyDigestConfig();
  const update = useUpdateWeeklyDigest();
  const sendNow = useSendWeeklyDigest();

  const [newEmail, setNewEmail] = useState('');
  const [localRecipients, setLocalRecipients] = useState<string[]>([]);
  const [localTopStories, setLocalTopStories] = useState(10);
  const [localThreshold, setLocalThreshold] = useState(-0.2);

  useEffect(() => {
    if (config) {
      setLocalRecipients(config.recipients || []);
      setLocalTopStories(config.nb_top_stories);
      setLocalThreshold(config.sentiment_alert_threshold);
    }
  }, [config]);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>;
  }

  if (!config) return <p className="text-sm text-muted-foreground">Configuration introuvable.</p>;

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@') || localRecipients.includes(email)) return;
    const updated = [...localRecipients, email];
    setLocalRecipients(updated);
    update.mutate({ recipients: updated });
    setNewEmail('');
  };

  const removeEmail = (email: string) => {
    const updated = localRecipients.filter(e => e !== email);
    setLocalRecipients(updated);
    update.mutate({ recipients: updated });
  };

  return (
    <div className="space-y-6">
      {/* Activation + Schedule */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" /> Configuration du Digest
            </CardTitle>
            <div className="flex items-center gap-3">
              <Badge variant={config.actif ? 'default' : 'secondary'}>
                {config.actif ? 'Actif' : 'Inactif'}
              </Badge>
              <Switch
                checked={config.actif}
                onCheckedChange={(actif) => update.mutate({ actif })}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                <Clock className="h-3 w-3 inline mr-1" />Jour d'envoi
              </label>
              <Select
                value={String(config.jour_envoi)}
                onValueChange={(v) => update.mutate({ jour_envoi: Number(v) })}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOURS.map((j, i) => (
                    <SelectItem key={i} value={String(i)}>{j}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Heure</label>
              <Input
                type="time"
                value={config.heure_envoi}
                onChange={(e) => update.mutate({ heure_envoi: e.target.value })}
                className="h-9"
              />
            </div>
          </div>

          {/* Content options */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                <Newspaper className="h-3 w-3" /> Nombre de top stories : {localTopStories}
              </label>
              <Slider
                value={[localTopStories]}
                onValueChange={([v]) => setLocalTopStories(v)}
                onValueCommit={([v]) => update.mutate({ nb_top_stories: v })}
                min={3}
                max={25}
                step={1}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                <AlertTriangle className="h-3 w-3" /> Seuil alerte sentiment : {localThreshold.toFixed(2)}
              </label>
              <Slider
                value={[localThreshold]}
                onValueChange={([v]) => setLocalThreshold(v)}
                onValueCommit={([v]) => update.mutate({ sentiment_alert_threshold: v })}
                min={-0.8}
                max={0}
                step={0.05}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
                Graphique sentiment
              </label>
              <Switch
                checked={config.include_sentiment_chart}
                onCheckedChange={(v) => update.mutate({ include_sentiment_chart: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-muted-foreground" />
                Top sources
              </label>
              <Switch
                checked={config.include_top_sources}
                onCheckedChange={(v) => update.mutate({ include_top_sources: v })}
              />
            </div>
          </div>

          {config.derniere_execution && (
            <p className="text-xs text-muted-foreground">
              Dernier envoi : {formatDistanceToNow(new Date(config.derniere_execution), { addSuffix: true, locale: fr })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Destinataires ({localRecipients.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="nom@domaine.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEmail()}
              className="flex-1"
            />
            <Button onClick={addEmail} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          </div>

          {localRecipients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun destinataire configuré.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {localRecipients.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1 pr-1">
                  {email}
                  <button
                    onClick={() => removeEmail(email)}
                    className={cn("ml-1 rounded-full p-0.5 hover:bg-destructive/20 transition-colors")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send now */}
      <Button
        onClick={() => sendNow.mutate()}
        disabled={sendNow.isPending || localRecipients.length === 0}
        className="w-full"
        size="lg"
      >
        {sendNow.isPending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi en cours…</>
        ) : (
          <><Send className="h-4 w-4 mr-2" /> Envoyer le digest maintenant</>
        )}
      </Button>
    </div>
  );
}
