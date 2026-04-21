import { useState } from 'react';
import { format, isWithinInterval, parseISO, isFuture, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, Plus, Trash2, Zap, ZapOff, MapPin, Tag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import {
  useEvenementsStrategiques,
  useCreateEvenement,
  useUpdateEvenement,
  useDeleteEvenement,
  type EvenementStrategique,
} from '@/hooks/useEvenementsStrategiques';

const CATEGORIES = [
  { value: 'telecom', label: 'Télécom' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'regulation', label: 'Régulation' },
  { value: 'innovation', label: 'Innovation' },
  { value: 'autre', label: 'Autre' },
];

function getEventStatus(evt: EvenementStrategique) {
  const now = new Date();
  const start = parseISO(evt.date_debut);
  const end = parseISO(evt.date_fin);
  if (isWithinInterval(now, { start, end })) return 'en-cours';
  if (isFuture(start)) return 'a-venir';
  return 'passe';
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'en-cours') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">🔴 En cours</Badge>;
  if (status === 'a-venir') return <Badge variant="secondary">📅 À venir</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Passé</Badge>;
}

export default function EvenementsPage() {
  const navigate = useNavigate();
  const { data: events, isLoading } = useEvenementsStrategiques();
  const createMut = useCreateEvenement();
  const updateMut = useUpdateEvenement();
  const deleteMut = useDeleteEvenement();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    nom: '', description: '', lieu: '', date_debut: '', date_fin: '',
    mots_cles: '', categorie: 'telecom', importance: 70,
  });

  const handleCreate = async () => {
    await createMut.mutateAsync({
      nom: form.nom,
      description: form.description || null,
      lieu: form.lieu || null,
      date_debut: form.date_debut,
      date_fin: form.date_fin,
      mots_cles: form.mots_cles.split(',').map(k => k.trim()).filter(Boolean),
      boost_actif: false,
      frequence_boost: '1h',
      categorie: form.categorie,
      importance: form.importance,
    });
    setDialogOpen(false);
    setForm({ nom: '', description: '', lieu: '', date_debut: '', date_fin: '', mots_cles: '', categorie: 'telecom', importance: 70 });
  };

  const activeEvents = events?.filter(e => getEventStatus(e) === 'en-cours') || [];
  const upcomingEvents = events?.filter(e => getEventStatus(e) === 'a-venir') || [];
  const pastEvents = events?.filter(e => getEventStatus(e) === 'passe') || [];

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              Événements Stratégiques
            </h1>
            <p className="text-muted-foreground text-sm">
              Calendrier des temps forts avec mode Boost automatique de collecte.
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter un événement
        </Button>
      </div>

      {/* Active boost banner */}
      {activeEvents.length > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-400 font-semibold mb-2">
              <Zap className="h-5 w-5" /> Mode Boost actif
            </div>
            <p className="text-sm text-muted-foreground">
              {activeEvents.length} événement(s) en cours. La collecte est intensifiée sur les mots-clés associés.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : (
        <>
          {[
            { title: 'En cours', items: activeEvents },
            { title: 'À venir', items: upcomingEvents },
            { title: 'Passés', items: pastEvents },
          ].map(section => section.items.length > 0 && (
            <section key={section.title} className="space-y-3">
              <h2 className="text-sm font-bold text-muted-foreground uppercase">{section.title}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {section.items.map(evt => {
                  const status = getEventStatus(evt);
                  return (
                    <Card key={evt.id} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{evt.nom}</CardTitle>
                          <StatusBadge status={status} />
                        </div>
                        {evt.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{evt.description}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {format(parseISO(evt.date_debut), 'dd MMM', { locale: fr })} → {format(parseISO(evt.date_fin), 'dd MMM yyyy', { locale: fr })}
                          </span>
                          {evt.lieu && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {evt.lieu}
                            </span>
                          )}
                        </div>

                        {evt.mots_cles.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {evt.mots_cles.slice(0, 5).map(k => (
                              <Badge key={k} variant="outline" className="text-[10px] py-0">
                                <Tag className="h-2.5 w-2.5 mr-1" />{k}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <Separator />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={evt.boost_actif}
                              onCheckedChange={(checked) => updateMut.mutate({ id: evt.id, boost_actif: checked })}
                            />
                            <Label className="text-xs flex items-center gap-1">
                              {evt.boost_actif ? <Zap className="h-3 w-3 text-yellow-400" /> : <ZapOff className="h-3 w-3" />}
                              Boost
                            </Label>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteMut.mutate(evt.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}

          {events?.length === 0 && (
            <Card className="p-12 text-center">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Aucun événement stratégique configuré.</p>
              <p className="text-xs text-muted-foreground mt-1">Ajoutez MWC, Gitex, Africa Tech Festival…</p>
            </Card>
          )}
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouvel événement stratégique</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="MWC Barcelona 2026" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Salon mondial du mobile…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date début *</Label>
                <Input type="date" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} />
              </div>
              <div>
                <Label>Date fin *</Label>
                <Input type="date" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lieu</Label>
                <Input value={form.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))} placeholder="Barcelone" />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={form.categorie} onValueChange={v => setForm(f => ({ ...f, categorie: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Mots-clés (séparés par des virgules)</Label>
              <Input value={form.mots_cles} onChange={e => setForm(f => ({ ...f, mots_cles: e.target.value }))} placeholder="#MWC26, GSMA, Mobile World Congress, ANSUT" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!form.nom || !form.date_debut || !form.date_fin || createMut.isPending}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
