import { useState, useEffect } from 'react';
import { Calendar, Clock, Mail, Play, Settings, Bell, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  useNewsletterProgrammation, 
  useUpdateProgrammation, 
  useToggleProgrammation,
  useRunScheduler,
  useScheduledNewsletters
} from '@/hooks/useNewsletterScheduler';
import type { NewsletterTon, NewsletterCible, ProgrammationFrequence } from '@/types/newsletter';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const JOURS_SEMAINE = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
];

const JOURS_MOIS = Array.from({ length: 28 }, (_, i) => ({
  value: i + 1,
  label: i === 0 ? '1er' : `${i + 1}`,
}));

const HEURES = Array.from({ length: 24 }, (_, i) => ({
  value: `${i.toString().padStart(2, '0')}:00:00`,
  label: `${i.toString().padStart(2, '0')}:00`,
}));

const TONS: { value: NewsletterTon; label: string }[] = [
  { value: 'institutionnel', label: 'Institutionnel' },
  { value: 'pedagogique', label: 'Pédagogique' },
  { value: 'strategique', label: 'Stratégique' },
];

const CIBLES: { value: NewsletterCible; label: string }[] = [
  { value: 'dg_ca', label: 'Direction / CA' },
  { value: 'partenaires', label: 'Partenaires' },
  { value: 'general', label: 'Grand public' },
];

export function NewsletterScheduler() {
  const { data: programmation, isLoading } = useNewsletterProgrammation();
  const { data: scheduledNewsletters } = useScheduledNewsletters();
  const updateProgrammation = useUpdateProgrammation();
  const toggleProgrammation = useToggleProgrammation();
  const runScheduler = useRunScheduler();

  const [localConfig, setLocalConfig] = useState({
    frequence: 'mensuel' as ProgrammationFrequence,
    jour_envoi: 1,
    heure_envoi: '09:00:00',
    ton_defaut: 'pedagogique' as NewsletterTon,
    cible_defaut: 'general' as NewsletterCible,
    delai_rappel_heures: 48,
    emails_rappel: [] as string[],
  });
  const [newEmail, setNewEmail] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (programmation) {
      setLocalConfig({
        frequence: programmation.frequence,
        jour_envoi: programmation.jour_envoi,
        heure_envoi: programmation.heure_envoi,
        ton_defaut: programmation.ton_defaut,
        cible_defaut: programmation.cible_defaut,
        delai_rappel_heures: programmation.delai_rappel_heures,
        emails_rappel: programmation.emails_rappel || [],
      });
    }
  }, [programmation]);

  const handleChange = <K extends keyof typeof localConfig>(key: K, value: typeof localConfig[K]) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleAddEmail = () => {
    if (newEmail && !localConfig.emails_rappel.includes(newEmail)) {
      handleChange('emails_rappel', [...localConfig.emails_rappel, newEmail]);
      setNewEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    handleChange('emails_rappel', localConfig.emails_rappel.filter((e) => e !== email));
  };

  const handleSave = () => {
    updateProgrammation.mutate(localConfig, {
      onSuccess: () => setHasChanges(false),
    });
  };

  const handleToggle = () => {
    if (programmation) {
      toggleProgrammation.mutate(!programmation.actif);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const pendingNewsletters = scheduledNewsletters?.filter(
    (n) => n.statut === 'brouillon' && n.programmation_active
  );

  return (
    <div className="space-y-6">
      {/* Configuration principale */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Programmation automatique</CardTitle>
                <CardDescription>
                  Configuration de la génération et de l'envoi automatique des newsletters
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="active">
                  {programmation?.actif ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" /> Actif
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Désactivé</Badge>
                  )}
                </Label>
                <Switch
                  id="active"
                  checked={programmation?.actif}
                  onCheckedChange={handleToggle}
                  disabled={toggleProgrammation.isPending}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fréquence */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Fréquence</Label>
              <Select
                value={localConfig.frequence}
                onValueChange={(v) => handleChange('frequence', v as ProgrammationFrequence)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hebdo">Hebdomadaire</SelectItem>
                  <SelectItem value="mensuel">Mensuelle</SelectItem>
                  <SelectItem value="desactive">Désactivée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {localConfig.frequence === 'hebdo' ? 'Jour de la semaine' : 'Jour du mois'}
              </Label>
              <Select
                value={localConfig.jour_envoi.toString()}
                onValueChange={(v) => handleChange('jour_envoi', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(localConfig.frequence === 'hebdo' ? JOURS_SEMAINE : JOURS_MOIS).map((jour) => (
                    <SelectItem key={jour.value} value={jour.value.toString()}>
                      {jour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Heure d'envoi</Label>
              <Select
                value={localConfig.heure_envoi}
                onValueChange={(v) => handleChange('heure_envoi', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HEURES.map((heure) => (
                    <SelectItem key={heure.value} value={heure.value}>
                      {heure.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Paramètres par défaut */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Ton par défaut</Label>
              <Select
                value={localConfig.ton_defaut}
                onValueChange={(v) => handleChange('ton_defaut', v as NewsletterTon)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONS.map((ton) => (
                    <SelectItem key={ton.value} value={ton.value}>
                      {ton.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cible par défaut</Label>
              <Select
                value={localConfig.cible_defaut}
                onValueChange={(v) => handleChange('cible_defaut', v as NewsletterCible)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CIBLES.map((cible) => (
                    <SelectItem key={cible.value} value={cible.value}>
                      {cible.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Rappels */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-medium">Rappels de validation</Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Délai de rappel avant envoi</Label>
                <Select
                  value={localConfig.delai_rappel_heures.toString()}
                  onValueChange={(v) => handleChange('delai_rappel_heures', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 heures</SelectItem>
                    <SelectItem value="48">48 heures</SelectItem>
                    <SelectItem value="72">72 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Emails de notification</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="admin@ansut.ci"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                />
                <Button type="button" variant="secondary" onClick={handleAddEmail}>
                  Ajouter
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {localConfig.emails_rappel.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    <Mail className="h-3 w-3" />
                    {email}
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
                {localConfig.emails_rappel.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    Aucun email configuré
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => runScheduler.mutate()}
              disabled={runScheduler.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              {runScheduler.isPending ? 'Exécution...' : 'Exécuter maintenant'}
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || updateProgrammation.isPending}>
              {updateProgrammation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prochaines échéances */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Prochaines échéances</CardTitle>
              <CardDescription>Newsletters programmées et à venir</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {programmation?.prochain_envoi ? (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Prochain envoi programmé</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(programmation.prochain_envoi), "EEEE d MMMM yyyy 'à' HH:mm", {
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                {formatDistanceToNow(new Date(programmation.prochain_envoi), {
                  locale: fr,
                  addSuffix: true,
                })}
              </Badge>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Aucun envoi programmé pour le moment
            </div>
          )}

          {pendingNewsletters && pendingNewsletters.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Newsletters en attente de validation
                </h4>
                {pendingNewsletters.map((newsletter) => (
                  <div
                    key={newsletter.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">Newsletter #{newsletter.numero}</p>
                      <p className="text-sm text-muted-foreground">
                        Envoi prévu:{' '}
                        {newsletter.date_envoi_programme
                          ? format(
                              new Date(newsletter.date_envoi_programme),
                              "d MMMM yyyy 'à' HH:mm",
                              { locale: fr }
                            )
                          : '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {newsletter.rappel_envoye && (
                        <Badge variant="outline" className="text-amber-600">
                          Rappel envoyé
                        </Badge>
                      )}
                      <Badge variant="secondary">Brouillon</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {programmation?.derniere_generation && (
            <div className="text-sm text-muted-foreground pt-2">
              Dernière génération automatique:{' '}
              {format(new Date(programmation.derniere_generation), "d MMMM yyyy 'à' HH:mm", {
                locale: fr,
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
