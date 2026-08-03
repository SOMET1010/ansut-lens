import { useState } from 'react';
import { AtSign, CheckCircle2, ExternalLink, Loader2, RefreshCw, Save, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer, PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { analyserUrlCompte, nettoyerNomAffiche, LIBELLE_PLATEFORME, libellePlateforme, type CompteAnalyse } from '@/lib/comptesSociaux';
import { useComptesSurveilles, useMutationsComptes } from '@/hooks/useComptesSurveilles';

/**
 * Comptes surveillés — outil « coller l'URL → paramètres ».
 *
 * La Communication copie l'URL d'un compte depuis son navigateur ; RADAR en
 * déduit les paramètres techniques (plateforme, identifiant, URL canonique), va
 * vérifier le compte en ligne (nom réel), et l'ajoute à la surveillance. Plus
 * besoin de connaître le format interne.
 */
export default function ComptesSurveillesPage() {
  const { data: comptes, isLoading } = useComptesSurveilles();
  const { ajouter, basculerActif, supprimer } = useMutationsComptes();

  const [url, setUrl] = useState('');
  const [analyse, setAnalyse] = useState<CompteAnalyse | null>(null);
  const [nom, setNom] = useState('');
  const [fonction, setFonction] = useState('');
  const [verif, setVerif] = useState<{ enCours: boolean; verifie: boolean; note?: string }>(
    { enCours: false, verifie: false },
  );

  function analyser() {
    const r = analyserUrlCompte(url);
    setAnalyse(r);
    setVerif({ enCours: false, verifie: false });
    setNom('');
    setFonction('');
    if (!r.valide) return;
    // Vérification en ligne (facultative) — récupère le nom affiché réel.
    verifierEnLigne(r);
  }

  async function verifierEnLigne(r: CompteAnalyse) {
    setVerif({ enCours: true, verifie: false });
    try {
      const { data, error } = await supabase.functions.invoke('resoudre-compte-social', {
        body: { url_profil: r.urlProfil, plateforme: r.plateforme },
      });
      if (error) throw error;
      if (data?.verifie) {
        setNom((prev) => prev || nettoyerNomAffiche(data.nom) || '');
        setVerif({ enCours: false, verifie: true, note: 'Compte joignable, nom récupéré.' });
      } else {
        setVerif({ enCours: false, verifie: false, note: data?.erreur || 'Vérification en ligne indisponible — saisissez le nom manuellement.' });
      }
    } catch (e) {
      setVerif({ enCours: false, verifie: false, note: `Vérification impossible : ${e instanceof Error ? e.message : ''}` });
    }
  }

  function enregistrer() {
    if (!analyse?.valide) return;
    if (!nom.trim()) { toast.error('Renseignez le nom du compte.'); return; }
    ajouter.mutate(
      {
        nom: nom.trim(),
        plateforme: analyse.plateforme,
        identifiant: analyse.identifiant,
        url_profil: analyse.urlProfil,
        fonction: fonction.trim() || null,
      },
      {
        onSuccess: () => {
          setUrl(''); setAnalyse(null); setNom(''); setFonction('');
          setVerif({ enCours: false, verifie: false });
        },
      },
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          titre="Comptes surveillés"
          description="Collez l’URL d’un compte réseau social : RADAR en déduit les paramètres, vérifie le compte et l’ajoute à la surveillance."
          icon={AtSign}
        />

        {/* Ajout par URL */}
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="url-compte">URL du profil (copiée depuis le navigateur)</Label>
              <div className="flex gap-2">
                <Input
                  id="url-compte"
                  placeholder="ex. https://www.facebook.com/ANSUT.CI"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && analyser()}
                />
                <Button onClick={analyser} disabled={!url.trim()}>
                  <Search className="mr-1.5 h-4 w-4" /> Analyser
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Facebook, LinkedIn (…/company/… ou …/in/…), X, YouTube (…/@…), Instagram, TikTok, Telegram.
              </p>
            </div>

            {analyse && !analyse.valide && (
              <Alert variant="destructive">
                <AlertDescription>{analyse.raison}</AlertDescription>
              </Alert>
            )}

            {analyse?.valide && (
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">{LIBELLE_PLATEFORME[analyse.plateforme]}</Badge>
                  <span className="text-muted-foreground">identifiant :</span>
                  <code className="rounded bg-background px-1.5 py-0.5">{analyse.identifiant}</code>
                  <a
                    href={analyse.urlProfil}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {analyse.urlProfil} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {verif.enCours ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Vérification du compte en ligne…
                    </span>
                  ) : verif.verifie ? (
                    <span className="inline-flex items-center gap-1 text-[hsl(var(--signal-positive))]">
                      <CheckCircle2 className="h-3 w-3" /> {verif.note}
                    </span>
                  ) : verif.note ? (
                    <span className="text-amber-600 dark:text-amber-400">{verif.note}</span>
                  ) : null}
                  {!verif.enCours && (
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => verifierEnLigne(analyse)}>
                      <RefreshCw className="mr-1 h-3 w-3" /> Revérifier
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="nom-compte">Nom affiché *</Label>
                    <Input
                      id="nom-compte"
                      placeholder="ex. ANSUT Côte d’Ivoire"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fonction-compte">Rôle / note (facultatif)</Label>
                    <Input
                      id="fonction-compte"
                      placeholder="ex. Compte officiel ANSUT"
                      value={fonction}
                      onChange={(e) => setFonction(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={enregistrer} disabled={ajouter.isPending || !nom.trim()}>
                    {ajouter.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                    Ajouter à la surveillance
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comptes existants */}
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold">
              Comptes déjà surveillés {comptes ? `(${comptes.length})` : ''}
            </h2>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : !comptes || comptes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun compte surveillé pour l’instant.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Plateforme</TableHead>
                      <TableHead>Identifiant</TableHead>
                      <TableHead className="text-center">Actif</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comptes.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nom}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{libellePlateforme(c.plateforme)}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.url_profil ? (
                            <a href={c.url_profil} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                              {c.identifiant} <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : c.identifiant}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={!!c.actif}
                            onCheckedChange={(v) => basculerActif.mutate({ id: c.id, actif: v })}
                            aria-label="Activer la surveillance"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Retirer « ${c.nom} » de la surveillance ?`)) supprimer.mutate(c.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
