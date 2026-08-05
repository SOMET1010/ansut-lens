import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft, ShieldAlert, Video, ListTree, FileWarning, Copy, Boxes,
  RefreshCw, Info, CheckCircle2, XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PageHeader } from '@/components/common/PageHeader';
import {
  useDiagnosticQualite, LIBELLES_MOTIFS, type FamilleRejet,
} from '@/hooks/useDiagnosticQualite';

const FAMILLES: {
  cle: FamilleRejet;
  titre: string;
  explication: string;
  icone: typeof Video;
}[] = [
  {
    cle: 'youtube_social',
    titre: 'Vidéos et réseaux sociaux',
    explication: 'YouTube, Facebook, X, TikTok… : impossible de les citer comme preuve.',
    icone: Video,
  },
  {
    cle: 'menu',
    titre: 'Pages de menu',
    explication: 'Accueil, rubrique ou tag : le lien ne mène pas à un article précis.',
    icone: ListTree,
  },
  {
    cle: 'placeholder',
    titre: 'Titres non informatifs',
    explication: '« Sans titre », « Accueil », erreurs de scraping : rien à lire.',
    icone: FileWarning,
  },
  {
    cle: 'doublon',
    titre: 'Doublons évités',
    explication: 'Sujet déjà couvert : rattaché au sujet existant plutôt que réinséré.',
    icone: Copy,
  },
];

export default function QualiteCollectePage() {
  const { data, isLoading, refetch, isFetching } = useDiagnosticQualite();

  const totalTraite = (data?.totalRetenus ?? 0) + (data?.totalRejets ?? 0);
  const tauxRejet =
    totalTraite > 0 ? Math.round(((data?.totalRejets ?? 0) / totalTraite) * 100) : null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/admin">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à l'administration
        </Link>
      </Button>

      <PageHeader
        titre="Qualité de collecte"
        description="Voir ce que RADAR a écarté à l'entrée, les doublons évités et le regroupement par sujet sur les dernières exécutions."
        icon={ShieldAlert}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Rejets par type */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FAMILLES.map(({ cle, titre, explication, icone: Icone }) => (
              <Card key={cle}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icone className="h-4 w-4" />
                    </span>
                    <CardTitle className="text-sm">{titre}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tabular-nums">
                    {data?.parFamille[cle] ?? 0}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {explication}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Synthèse + clusters */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ce qui entre, ce qui est écarté</CardTitle>
                <CardDescription>
                  Cumul sur les {data?.nbExecutionsMesurees ?? 0} exécution(s) ayant journalisé
                  la qualité.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Contenus retenus</span>
                  <span className="text-2xl font-bold tabular-nums">{data?.totalRetenus ?? 0}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Contenus écartés</span>
                  <span className="text-2xl font-bold tabular-nums">{data?.totalRejets ?? 0}</span>
                </div>
                {tauxRejet !== null && (
                  <div className="space-y-1.5">
                    <Progress value={tauxRejet} />
                    <p className="text-xs text-muted-foreground">
                      {tauxRejet}% des contenus candidats ont été écartés avant insertion.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Regroupement par sujet</CardTitle>
                </div>
                <CardDescription>
                  Part des contenus des 7 derniers jours rattachés à un sujet (cluster).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data?.clusters.taux === null ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun contenu collecté sur la période : rien à mesurer.
                  </p>
                ) : (
                  <>
                    <p className="text-3xl font-bold tabular-nums">{data?.clusters.taux}%</p>
                    <Progress value={data?.clusters.taux ?? 0} />
                    <p className="text-xs text-muted-foreground">
                      {data?.clusters.avecCluster} contenu(s) rattachés sur{' '}
                      {data?.clusters.total} collectés.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Détail par exécution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dernières exécutions</CardTitle>
              <CardDescription>
                Une ligne par collecte, avec le détail des motifs de rejet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.executions.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">Aucune collecte enregistrée.</p>
              )}
              {data?.executions.map((ex) => (
                <div key={ex.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {ex.statut === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm font-semibold">{ex.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ex.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {ex.nbResultats} retenu(s)
                    </Badge>
                    {ex.qualiteMesuree ? (
                      <Badge variant="outline" className="text-[10px]">
                        {ex.totalRejets} écarté(s)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Qualité non mesurée
                      </Badge>
                    )}
                    {ex.sources.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        · {ex.sources.join(', ')}
                      </span>
                    )}
                  </div>

                  {ex.erreur && (
                    <p className="mt-2 text-xs text-destructive">{ex.erreur}</p>
                  )}

                  {ex.qualiteMesuree && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(ex.rejets)
                        .sort((a, b) => b[1] - a[1])
                        .map(([motif, n]) => (
                          <span
                            key={motif}
                            className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {LIBELLES_MOTIFS[motif] ?? motif} · {n}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Comment lire cet écran</AlertTitle>
            <AlertDescription className="text-xs leading-relaxed">
              Les motifs proviennent du filtre d'entrée commun aux collectes. Les exécutions
              antérieures à la mise en place de cette journalisation apparaissent en « qualité
              non mesurée » : aucune valeur n'est reconstituée après coup.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
