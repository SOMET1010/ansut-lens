import { useState, useEffect } from 'react';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Newspaper, Plus, Save, Trash2, Tags, Globe, AlertTriangle, Clock, Activity, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import {
  useTitrologieSources, useUpsertSource, useDeleteSource,
  useTitrologieKeywords, useUpsertKeyword, useDeleteKeyword,
  useTitrologieSettings, useUpdateTitrologieSettings,
  type TitrologieSettings,
} from '@/hooks/useTitrologieAdmin';
import { useTitrologieRuns } from '@/hooks/useTitrologieRuns';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const sourceSchema = z.object({
  nom: z.string().trim().min(2).max(100),
  url: z.string().trim().url().max(300),
  type: z.string().trim().min(2).max(40),
  priorite: z.number().int().min(0).max(100),
  notes: z.string().max(500).optional().or(z.literal('')),
});

const keywordSchema = z.object({
  mot_cle: z.string().trim().min(2).max(80),
  categorie: z.string().trim().min(2).max(40),
  poids: z.number().int().min(0).max(10),
  notes: z.string().max(300).optional().or(z.literal('')),
});

const cronSchema = z.string().regex(/^[\d*\/,\-\s]+$/, 'Format cron invalide').max(60);

export default function TitrologieAdminPage() {
  const sourcesQ = useTitrologieSources();
  const kwQ = useTitrologieKeywords();
  const settingsQ = useTitrologieSettings();
  const upsertSrc = useUpsertSource();
  const delSrc = useDeleteSource();
  const upsertKw = useUpsertKeyword();
  const delKw = useDeleteKeyword();
  const updSettings = useUpdateTitrologieSettings();

  // ----- Settings form -----
  const [settings, setSettings] = useState<TitrologieSettings>({ cron_schedule: '0 6 * * *', alert_threshold_rouge: 6, alert_threshold_orange: 3 });
  useEffect(() => { if (settingsQ.data) setSettings(settingsQ.data); }, [settingsQ.data]);

  // ----- New source/keyword -----
  const [newSrc, setNewSrc] = useState({ nom: '', url: '', type: 'national', priorite: 50, notes: '' });
  const [newKw, setNewKw] = useState({ mot_cle: '', categorie: 'sectoriel', poids: 2, notes: '' });

  const submitSource = () => {
    const r = sourceSchema.safeParse(newSrc);
    if (!r.success) { return alert(r.error.issues[0]?.message || 'Champs invalides'); }
    upsertSrc.mutate({ ...r.data, actif: true } as any, {
      onSuccess: () => setNewSrc({ nom: '', url: '', type: 'national', priorite: 50, notes: '' }),
    });
  };
  const submitKeyword = () => {
    const r = keywordSchema.safeParse(newKw);
    if (!r.success) { return alert(r.error.issues[0]?.message || 'Champs invalides'); }
    upsertKw.mutate({ ...r.data, mot_cle: r.data.mot_cle.toLowerCase(), actif: true } as any, {
      onSuccess: () => setNewKw({ mot_cle: '', categorie: 'sectoriel', poids: 2, notes: '' }),
    });
  };
  const submitSettings = () => {
    const r = cronSchema.safeParse(settings.cron_schedule);
    if (!r.success) return alert(r.error.issues[0]?.message);
    if (settings.alert_threshold_rouge <= settings.alert_threshold_orange) {
      return alert('Le seuil ROUGE doit être > seuil ORANGE');
    }
    updSettings.mutate(settings);
  };

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-6xl">
      <header className="flex items-center gap-3">
        <Newspaper className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Administration Titrologie</h1>
          <p className="text-sm text-muted-foreground">Sources scannées, fréquence de collecte, seuils d'alerte et catalogue de mots-clés Service Universel.</p>
        </div>
      </header>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings"><Clock className="h-4 w-4 mr-1.5" />Fréquence & seuils</TabsTrigger>
          <TabsTrigger value="sources"><Globe className="h-4 w-4 mr-1.5" />Sources ({sourcesQ.data?.length || 0})</TabsTrigger>
          <TabsTrigger value="keywords"><Tags className="h-4 w-4 mr-1.5" />Mots-clés ({kwQ.data?.length || 0})</TabsTrigger>
          <TabsTrigger value="logs"><Activity className="h-4 w-4 mr-1.5" />Logs techniques</TabsTrigger>
        </TabsList>

        {/* ---------- Settings ---------- */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fréquence de collecte</CardTitle>
              <CardDescription>Expression cron utilisée par la collecte quotidienne (UTC).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-w-md">
              <Label htmlFor="cron">Cron schedule</Label>
              <Input id="cron" value={settings.cron_schedule} onChange={e => setSettings(s => ({ ...s, cron_schedule: e.target.value }))} placeholder="0 6 * * *" />
              <p className="text-xs text-muted-foreground">Exemples : <code>0 6 * * *</code> (06h00 UTC), <code>0 5,12 * * *</code> (deux fois/jour).</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Seuils d'alerte risque</CardTitle>
              <CardDescription>Score (somme des poids des mots-clés détectés sur une une) déclenchant chaque niveau.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <Label>Seuil ORANGE (≥)</Label>
                <Input type="number" min={0} max={100} value={settings.alert_threshold_orange} onChange={e => setSettings(s => ({ ...s, alert_threshold_orange: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Seuil ROUGE (≥)</Label>
                <Input type="number" min={0} max={100} value={settings.alert_threshold_rouge} onChange={e => setSettings(s => ({ ...s, alert_threshold_rouge: Number(e.target.value) }))} />
              </div>
            </CardContent>
          </Card>

          <Button onClick={submitSettings} disabled={updSettings.isPending}>
            <Save className="h-4 w-4 mr-1.5" /> Enregistrer les paramètres
          </Button>
        </TabsContent>

        {/* ---------- Sources ---------- */}
        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Ajouter une source</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-2"><Label>Nom</Label><Input value={newSrc.nom} onChange={e => setNewSrc({ ...newSrc, nom: e.target.value })} placeholder="Le Patriote" /></div>
              <div className="md:col-span-2"><Label>URL</Label><Input value={newSrc.url} onChange={e => setNewSrc({ ...newSrc, url: e.target.value })} placeholder="https://…" /></div>
              <div><Label>Type</Label><Input value={newSrc.type} onChange={e => setNewSrc({ ...newSrc, type: e.target.value })} placeholder="national" /></div>
              <div><Label>Priorité</Label><Input type="number" min={0} max={100} value={newSrc.priorite} onChange={e => setNewSrc({ ...newSrc, priorite: Number(e.target.value) })} /></div>
              <div className="md:col-span-3"><Label>Notes</Label><Textarea rows={1} value={newSrc.notes} onChange={e => setNewSrc({ ...newSrc, notes: e.target.value })} /></div>
              <Button onClick={submitSource} disabled={upsertSrc.isPending}><Plus className="h-4 w-4 mr-1.5" />Ajouter</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Sources actives</CardTitle></CardHeader>
            <CardContent>
              {sourcesQ.isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left border-b text-muted-foreground"><th className="py-2 pr-2">Nom</th><th className="pr-2">URL</th><th className="pr-2">Type</th><th className="pr-2">Priorité</th><th className="pr-2">Actif</th><th></th></tr></thead>
                    <tbody>
                      {(sourcesQ.data || []).map(s => (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="py-2 pr-2 font-medium">{s.nom}</td>
                          <td className="pr-2"><a href={s.url} target="_blank" rel="noreferrer" className="text-primary underline truncate inline-block max-w-[260px]">{s.url}</a></td>
                          <td className="pr-2"><Badge variant="outline" className="text-xs">{s.type}</Badge></td>
                          <td className="pr-2">{s.priorite}</td>
                          <td className="pr-2">
                            <Switch checked={s.actif} onCheckedChange={(v) => upsertSrc.mutate({ id: s.id, nom: s.nom, url: s.url, actif: v } as any)} />
                          </td>
                          <td className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Supprimer ${s.nom} ?`)) delSrc.mutate(s.id); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Keywords ---------- */}
        <TabsContent value="keywords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ajouter un mot-clé Service Universel</CardTitle>
              <CardDescription>Le poids (0-10) est additionné lors du scoring du risque réputationnel pour chaque une.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-2"><Label>Mot-clé</Label><Input value={newKw.mot_cle} onChange={e => setNewKw({ ...newKw, mot_cle: e.target.value })} placeholder="ex: zones blanches" /></div>
              <div><Label>Catégorie</Label><Input value={newKw.categorie} onChange={e => setNewKw({ ...newKw, categorie: e.target.value })} placeholder="direct | sectoriel | concurrence" /></div>
              <div><Label>Poids</Label><Input type="number" min={0} max={10} value={newKw.poids} onChange={e => setNewKw({ ...newKw, poids: Number(e.target.value) })} /></div>
              <Button onClick={submitKeyword} disabled={upsertKw.isPending}><Plus className="h-4 w-4 mr-1.5" />Ajouter</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Catalogue de mots-clés</CardTitle></CardHeader>
            <CardContent>
              {kwQ.isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left border-b text-muted-foreground"><th className="py-2 pr-2">Mot-clé</th><th className="pr-2">Catégorie</th><th className="pr-2">Poids</th><th className="pr-2">Actif</th><th></th></tr></thead>
                    <tbody>
                      {(kwQ.data || []).map(k => (
                        <tr key={k.id} className="border-b last:border-0">
                          <td className="py-2 pr-2 font-mono">{k.mot_cle}</td>
                          <td className="pr-2"><Badge variant="outline" className="text-xs">{k.categorie}</Badge></td>
                          <td className="pr-2">
                            <Input type="number" min={0} max={10} className="w-16 h-7" defaultValue={k.poids}
                              onBlur={(e) => {
                                const v = Number(e.target.value);
                                if (v !== k.poids) upsertKw.mutate({ id: k.id, mot_cle: k.mot_cle, poids: v } as any);
                              }} />
                          </td>
                          <td className="pr-2">
                            <Switch checked={k.actif} onCheckedChange={(v) => upsertKw.mutate({ id: k.id, mot_cle: k.mot_cle, actif: v } as any)} />
                          </td>
                          <td className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Supprimer "${k.mot_cle}" ?`)) delKw.mutate(k.id); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* ---------- Logs techniques ---------- */}
        <TabsContent value="logs" className="space-y-4">
          <LogsTechniques />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function statutBadge(s: string) {
  if (s === 'success') return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>;
  if (s === 'partial') return <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]"><AlertCircle className="h-3 w-3 mr-1" />Partiel</Badge>;
  if (s === 'error') return <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px]"><XCircle className="h-3 w-3 mr-1" />Erreur</Badge>;
  return <Badge variant="outline" className="text-[10px]">{s}</Badge>;
}

function LogsTechniques() {
  const runsQ = useTitrologieRuns(20);
  const runs = runsQ.data || [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Historique des collectes (20 dernières)</CardTitle>
        <CardDescription>Suivi par source : images détectées, traitées, erreurs OCR, statut.</CardDescription>
      </CardHeader>
      <CardContent>
        {runsQ.isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune collecte enregistrée.</p>
        ) : (
          <div className="space-y-4">
            {runs.map(run => {
              const sources = run.metadata?.sources || [];
              const failures = run.metadata?.failures || [];
              const exploitables = run.metadata?.exploitables;
              const threshold = run.metadata?.ocr_threshold ?? 40;
              return (
                <div key={run.id} className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-semibold">{run.run_date}</span>
                    {statutBadge(run.status)}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(run.started_at), { addSuffix: true, locale: fr })}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {run.unes_collected} collectées · {run.unes_analyzed} analysées
                      {typeof exploitables === 'number' ? ` · ${exploitables} exploitables` : ''}
                      {failures.length > 0 ? ` · ${failures.length} OCR KO` : ''}
                      {run.duration_ms ? ` · ${(run.duration_ms / 1000).toFixed(1)}s` : ''}
                    </span>
                  </div>
                  {run.error && <div className="text-xs text-red-600">⚠ {run.error}</div>}
                  {sources.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left border-b text-muted-foreground">
                            <th className="py-1.5 pr-2">Source</th>
                            <th className="pr-2">URL</th>
                            <th className="pr-2 text-right">Détectées</th>
                            <th className="pr-2 text-right">Traitées</th>
                            <th className="pr-2 text-right">Erreurs OCR</th>
                            <th className="pr-2">Dernier scan</th>
                            <th>Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sources.map((s, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-1.5 pr-2 font-medium">{s.source}</td>
                              <td className="pr-2"><a href={s.url} target="_blank" rel="noreferrer" className="text-primary underline truncate inline-block max-w-[220px]">{s.url}</a></td>
                              <td className="pr-2 text-right">{s.nombre_images_detectees}</td>
                              <td className="pr-2 text-right">{s.nombre_images_traitees}</td>
                              <td className="pr-2 text-right">{s.nombre_erreurs_ocr}</td>
                              <td className="pr-2 text-muted-foreground">{new Date(s.dernier_scan).toLocaleTimeString('fr-FR')}</td>
                              <td>{statutBadge(s.statut)}{s.error && <div className="text-[10px] text-red-600 mt-0.5">{s.error}</div>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Pas de détail par source (collecte antérieure au tracking).</p>
                  )}

                  {failures.length > 0 && (
                    <details className="rounded border border-amber-500/30 bg-amber-500/5 p-2" open={failures.length <= 3}>
                      <summary className="cursor-pointer text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" /> {failures.length} journal{failures.length > 1 ? 'aux' : ''} mal lu{failures.length > 1 ? 's' : ''} (seuil OCR : {threshold}/100)
                      </summary>
                      <div className="overflow-x-auto mt-2">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="text-left border-b text-muted-foreground">
                              <th className="py-1 pr-2">Journal</th>
                              <th className="pr-2">Source</th>
                              <th className="pr-2 text-right">Confiance</th>
                              <th className="pr-2">Code</th>
                              <th className="pr-2">Raison</th>
                              <th>Image</th>
                            </tr>
                          </thead>
                          <tbody>
                            {failures.map((f, i) => (
                              <tr key={i} className="border-b last:border-0 align-top">
                                <td className="py-1 pr-2 font-medium">{f.journal}</td>
                                <td className="pr-2 text-muted-foreground">{f.source}</td>
                                <td className="pr-2 text-right">
                                  <Badge variant="outline" className={`text-[10px] ${f.ocr_confidence < threshold ? 'border-red-300 text-red-700' : ''}`}>
                                    {f.ocr_confidence}/100
                                  </Badge>
                                </td>
                                <td className="pr-2"><Badge variant="outline" className="text-[10px]">{f.raison_code}</Badge></td>
                                <td className="pr-2">
                                  {f.reason}
                                  {f.ocr_warnings && f.ocr_warnings.length > 0 && (
                                    <div className="text-[10px] text-muted-foreground mt-0.5">⚠ {f.ocr_warnings.join(' · ')}</div>
                                  )}
                                </td>
                                <td>
                                  {f.image_url && <a href={f.image_url} target="_blank" rel="noreferrer" className="text-primary underline">voir</a>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
