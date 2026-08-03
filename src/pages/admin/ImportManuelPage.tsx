import { useState } from 'react';
import { FilePlus2, Loader2, Save, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer, PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  PLATEFORMES_IMPORT, parseBulk, csvVersEntrees, versPublication, dateValide,
  type EntreeManuelle,
} from '@/lib/importManuel';

/**
 * Import manuel de publications — filet provisoire pendant la mise en place des
 * connecteurs officiels. Alimente le même pipeline avec une date réelle saisie.
 */

const CHAMP =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

async function insererLot(pubs: ReturnType<typeof versPublication>[]) {
  const { error } = await supabase.from('publications_institutionnelles').insert(pubs);
  if (error) throw error;
}

export default function ImportManuelPage() {
  // --- Formulaire une publication ---
  const [f, setF] = useState<EntreeManuelle>({
    plateforme: 'facebook', date: '', type: 'post', url: '', texte: '',
    likes: null, comments: null, shares: null, vues: null,
  });
  const [enCours, setEnCours] = useState(false);

  // --- Import en vrac ---
  const [bulk, setBulk] = useState('');
  const [apercu, setApercu] = useState<{ entrees: EntreeManuelle[]; erreurs: string[] } | null>(null);
  const [bulkEnCours, setBulkEnCours] = useState(false);

  const num = (v: string) => (v === '' ? null : Number(v));

  async function ajouterUne() {
    if (!dateValide(f.date)) { toast.error('Date invalide (attendu AAAA-MM-JJ, non future).'); return; }
    if (!f.texte.trim()) { toast.error('Le texte est obligatoire.'); return; }
    setEnCours(true);
    try {
      await insererLot([versPublication(f)]);
      toast.success('Publication ajoutée. Pensez à lancer le Backfill (Moteur éditorial).');
      setF({ ...f, url: '', texte: '', likes: null, comments: null, shares: null, vues: null });
    } catch (e) {
      toast.error(`Échec : ${e instanceof Error ? e.message : ''}`);
    } finally {
      setEnCours(false);
    }
  }

  const [nomFichier, setNomFichier] = useState('');

  async function onFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNomFichier(file.name);
    try {
      const texte = await file.text();
      setApercu(csvVersEntrees(texte));
    } catch (err) {
      toast.error(`Lecture du fichier impossible : ${err instanceof Error ? err.message : ''}`);
    }
    e.target.value = '';
  }

  async function importerVrac() {
    if (!apercu || apercu.entrees.length === 0) return;
    setBulkEnCours(true);
    try {
      await insererLot(apercu.entrees.map(versPublication));
      toast.success(`${apercu.entrees.length} publication(s) importée(s). Lancez le Backfill.`);
      setBulk(''); setApercu(null);
    } catch (e) {
      toast.error(`Échec : ${e instanceof Error ? e.message : ''}`);
    } finally {
      setBulkEnCours(false);
    }
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          titre="Import manuel de publications"
          description="Filet provisoire, le temps des connecteurs officiels : saisissez des publications réelles (date, texte, métriques). Elles rejoignent le même pipeline."
          icon={FilePlus2}
        />

        <Alert>
          <AlertDescription className="text-sm">
            La <strong>date que vous indiquez</strong> est traitée comme la vraie date de publication.
            Après un import, ouvrez <strong>Moteur éditorial → Backfill</strong> pour qualifier les nouvelles publications,
            puis <strong>Insights</strong> pour les voir.
          </AlertDescription>
        </Alert>

        {/* Une publication */}
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-sm font-semibold">Ajouter une publication</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Plateforme</Label>
                <select className={CHAMP} value={f.plateforme} onChange={(e) => setF({ ...f, plateforme: e.target.value })}>
                  {PLATEFORMES_IMPORT.map((p) => <option key={p.valeur} value={p.valeur}>{p.libelle}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Date de publication *</Label>
                <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select className={CHAMP} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                  {['post', 'article', 'video', 'image', 'communique'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>URL du post</Label>
                <Input placeholder="https://…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Texte de la publication *</Label>
              <Textarea rows={3} value={f.texte} onChange={(e) => setF({ ...f, texte: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label>J’aime</Label>
                <Input type="number" min={0} value={f.likes ?? ''} onChange={(e) => setF({ ...f, likes: num(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Commentaires</Label>
                <Input type="number" min={0} value={f.comments ?? ''} onChange={(e) => setF({ ...f, comments: num(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Partages</Label>
                <Input type="number" min={0} value={f.shares ?? ''} onChange={(e) => setF({ ...f, shares: num(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Vues</Label>
                <Input type="number" min={0} value={f.vues ?? ''} onChange={(e) => setF({ ...f, vues: num(e.target.value) })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={ajouterUne} disabled={enCours}>
                {enCours ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dépôt de fichier CSV */}
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold">Déposer un fichier CSV</h2>
            <p className="text-xs text-muted-foreground">
              Déposez un CSV (export de l’agent d’extraction, ou « Enregistrer sous → CSV » depuis Excel).
              Les colonnes sont reconnues par leur nom : <code>plateforme</code>, <code>date_publication_estimee</code> (ou <code>date</code>),
              <code>contenu</code> (ou <code>texte</code>), <code>type_contenu</code>, <code>reactions_count</code>, <code>comments_count</code>,
              <code>shares_count</code>, <code>vues_count</code>, <code>hashtags</code>, <code>url_original</code>.
            </p>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                <Upload className="h-4 w-4" /> Choisir un fichier CSV
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFichier} />
              </label>
              {nomFichier && <span className="text-xs text-muted-foreground">{nomFichier}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Import en vrac */}
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold">Import en vrac (copier-coller)</h2>
            <p className="text-xs text-muted-foreground">
              Une publication par ligne, champs séparés par des barres verticales :<br />
              <code>plateforme | AAAA-MM-JJ | type | url | texte | j’aime | commentaires | partages | vues</code><br />
              Les 5 premiers champs sont requis ; les métriques sont facultatives.
            </p>
            <Textarea
              rows={6}
              placeholder="facebook | 2026-07-20 | post | https://fb.com/p/1 | Transformation digitale #ANSUT | 12 | 2 | 5 | 300"
              value={bulk}
              onChange={(e) => { setBulk(e.target.value); setApercu(null); }}
              className="font-mono text-xs"
            />
            <Button variant="secondary" onClick={() => setApercu(parseBulk(bulk))} disabled={!bulk.trim()}>
              <Upload className="mr-1.5 h-4 w-4" /> Analyser le collage
            </Button>
          </CardContent>
        </Card>

        {/* Aperçu + import — partagé par le CSV et le collage */}
        {apercu && (
          <Card className="border-primary/40">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm">
                  <span className="font-semibold">{apercu.entrees.length}</span> publication(s) valide(s)
                  {apercu.erreurs.length > 0 && <> · <span className="text-destructive">{apercu.erreurs.length} erreur(s)</span></>}
                </p>
                <Button onClick={importerVrac} disabled={bulkEnCours || apercu.entrees.length === 0}>
                  {bulkEnCours ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Importer {apercu.entrees.length} publication(s)
                </Button>
              </div>
              {apercu.erreurs.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <ul className="list-disc pl-4">
                      {apercu.erreurs.map((er, i) => <li key={i}>{er}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
