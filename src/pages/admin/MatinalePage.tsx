import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Newspaper, Send, Eye, Loader2, Target, MessageSquare,
  CheckCircle2, XCircle, Clock, ArrowLeft, CalendarClock, Info,
  FileText, ListChecks, Building2, AlertTriangle, Lightbulb, BarChart3, ExternalLink,
} from 'lucide-react';

const RUBRIQUE_LABELS: Record<string, string> = {
  telecom_numerique: 'Télécom / Numérique',
  economie_finance: 'Économie / Finance',
  gouvernance_regulation: 'Gouvernance / Régulation',
  international: 'International',
};
const RUBRIQUE_ORDER = ['telecom_numerique', 'economie_finance', 'gouvernance_regulation', 'international'];

function isValidUrl(u?: string): boolean {
  if (!u || typeof u !== 'string') return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatRevueDate(d?: string): string {
  if (!d) return '—';
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return format(parsed, 'dd MMM yyyy', { locale: fr });
}

import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMatinalePreview, useMatinaleSend, useMatinaleHistory, type FreshnessWindow } from '@/hooks/useMatinale';

export default function MatinalePage() {
  const preview = useMatinalePreview();
  const send = useMatinaleSend();
  const { data: history, isLoading: historyLoading } = useMatinaleHistory();
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [matinaleData, setMatinaleData] = useState<any>(null);
  const [freshnessMeta, setFreshnessMeta] = useState<any>(null);
  const [freshness, setFreshness] = useState<FreshnessWindow>(24);

  const handlePreview = async () => {
    const result = await preview.mutateAsync(freshness);
    setPreviewHtml(result.html || null);
    setMatinaleData(result.matinale);
    setFreshnessMeta(result.freshness || null);
  };

  const handleSend = async () => {
    await send.mutateAsync({ freshnessHours: freshness });
  };

  const freshnessLabel = freshness === 24 ? '24 dernières heures' : freshness === 48 ? '48 dernières heures' : '7 derniers jours';

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft size={20} /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Newspaper className="h-8 w-8 text-primary" />
              La Matinale Com
            </h1>
          <p className="text-muted-foreground">
            Briefing quotidien automatique pour l'équipe Communication
          </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={preview.isPending}
          >
            {preview.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
            Prévisualiser
          </Button>
          <Button
            onClick={handleSend}
            disabled={send.isPending}
          >
            {send.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Envoyer maintenant
          </Button>
        </div>
      </div>

      {/* Freshness control bar */}
      <TooltipProvider>
        <Card className="glass border-primary/20">
          <CardContent className="py-3 flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="h-4 w-4 text-primary" />
              Période d'analyse
            </div>
            <ToggleGroup
              type="single"
              value={String(freshness)}
              onValueChange={(v) => v && setFreshness(Number(v) as FreshnessWindow)}
              className="bg-muted/40 rounded-md"
            >
              <ToggleGroupItem value="24" className="text-xs px-3">24h</ToggleGroupItem>
              <ToggleGroupItem value="48" className="text-xs px-3">48h</ToggleGroupItem>
              <ToggleGroupItem value="168" className="text-xs px-3">7 jours</ToggleGroupItem>
            </ToggleGroup>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="gap-1 cursor-help">
                  <Info className="h-3 w-3" />
                  Fraîcheur basée sur date de publication
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                <p className="font-semibold mb-1">Garantie de fraîcheur</p>
                <p>
                  Les articles sont filtrés sur leur <strong>date de publication réelle</strong>{' '}
                  ({freshnessLabel}), pas sur leur date d'ingestion. Les vieux articles
                  ré-indexés récemment sont automatiquement écartés.
                </p>
              </TooltipContent>
            </Tooltip>

            {freshnessMeta && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground ml-auto">
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  {freshnessMeta.articles_kept} articles retenus
                </Badge>
                {freshnessMeta.articles_total_raw > freshnessMeta.articles_kept && (
                  <Badge variant="outline" className="gap-1">
                    <XCircle className="h-3 w-3 text-amber-600" />
                    {freshnessMeta.articles_total_raw - freshnessMeta.articles_kept} écartés (trop anciens)
                  </Badge>
                )}
                {freshnessMeta.newest_publication && (
                  <span>
                    + récent : {format(new Date(freshnessMeta.newest_publication), 'dd MMM HH:mm', { locale: fr })}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TooltipProvider>

      {/* Content Sections */}
      <Tabs defaultValue="preview" className="w-full">
        <TabsList>
          <TabsTrigger value="preview">Aperçu du jour</TabsTrigger>
          <TabsTrigger value="email">Rendu email</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          {!matinaleData && !preview.isPending && (
            <Card className="glass">
              <CardContent className="py-12 text-center">
                <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Cliquez sur "Prévisualiser" pour générer la matinale du jour
                </p>
                <Button variant="outline" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Générer l'aperçu
                </Button>
              </CardContent>
            </Card>
          )}

          {preview.isPending && (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-24" />
              <Skeleton className="h-40" />
            </div>
          )}

          {matinaleData && (
            <div className="space-y-4">
              {/* B. Revue de presse */}
              <Card className="glass border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Revue de presse
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {matinaleData.revue_de_presse?.length ?? 0} titres
                    </Badge>
                  </CardTitle>
                  <CardDescription>Tri par rubrique — neutre, sans analyse</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {RUBRIQUE_ORDER.map((rub) => {
                    const items = (matinaleData.revue_de_presse || []).filter((r: any) => r.rubrique === rub);
                    if (!items.length) return null;
                    return (
                      <div key={rub}>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                          {RUBRIQUE_LABELS[rub]}
                        </h4>
                        <ul className="space-y-2">
                          {items.map((it: any, i: number) => (
                            <li key={i} className="text-sm border-l-2 border-primary/40 pl-3">
                              <a
                                href={it.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium hover:underline inline-flex items-center gap-1"
                              >
                                {it.titre}
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </a>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {it.source} · {it.date}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  {!matinaleData.revue_de_presse?.length && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun titre retenu</p>
                  )}
                </CardContent>
              </Card>

              {/* C. À retenir */}
              {matinaleData.a_retenir?.length > 0 && (
                <Card className="glass">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-primary" />
                      À retenir aujourd'hui
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {matinaleData.a_retenir.map((p: string, i: number) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-primary font-bold">{i + 1}.</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* D. Retour ANSUT */}
              {matinaleData.retour_ansut && (
                <Card className="glass border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Retour ANSUT
                      {matinaleData.retour_ansut.niveau_attention && (
                        <Badge className={
                          matinaleData.retour_ansut.niveau_attention === 'Élevé'
                            ? 'bg-destructive/15 text-destructive'
                            : matinaleData.retour_ansut.niveau_attention === 'Moyen'
                              ? 'bg-amber-500/15 text-amber-600'
                              : 'bg-emerald-500/15 text-emerald-600'
                        }>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Attention {matinaleData.retour_ansut.niveau_attention}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {matinaleData.retour_ansut.lecture_service_universel && (
                      <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                        <div className="text-xs font-semibold uppercase text-muted-foreground">Lecture Service Universel</div>
                        {matinaleData.retour_ansut.lecture_service_universel.acces && (
                          <p><strong>Accès :</strong> {matinaleData.retour_ansut.lecture_service_universel.acces}</p>
                        )}
                        {matinaleData.retour_ansut.lecture_service_universel.usages && (
                          <p><strong>Usages :</strong> {matinaleData.retour_ansut.lecture_service_universel.usages}</p>
                        )}
                        {matinaleData.retour_ansut.lecture_service_universel.impact && (
                          <p><strong>Impact :</strong> {matinaleData.retour_ansut.lecture_service_universel.impact}</p>
                        )}
                      </div>
                    )}
                    {matinaleData.retour_ansut.implication_ansut && (
                      <div>
                        <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Implication ANSUT</div>
                        <p>{matinaleData.retour_ansut.implication_ansut}</p>
                      </div>
                    )}
                    {matinaleData.retour_ansut.action_suggeree && (
                      <div className="rounded-lg bg-violet-500/5 border border-dashed border-violet-500/30 p-3 flex gap-2">
                        <Lightbulb className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold uppercase text-violet-600 mb-0.5">Action suggérée</div>
                          <p>{matinaleData.retour_ansut.action_suggeree}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* E. Focus du jour (conditional) */}
              {matinaleData.focus_du_jour && (
                <Card className="glass border-amber-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-amber-600" />
                      Focus du jour — {matinaleData.focus_du_jour.titre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-line leading-relaxed">
                      {matinaleData.focus_du_jour.contenu}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* F. Activité ANSUT */}
              {matinaleData.activite_ansut && (
                <Card className="glass">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Activité ANSUT
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 flex-wrap">
                      <Badge variant="secondary" className="gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {matinaleData.activite_ansut.publications_count ?? 0} publication(s)
                      </Badge>
                      <Badge className={
                        matinaleData.activite_ansut.visibilite === 'Fort'
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : matinaleData.activite_ansut.visibilite === 'Moyen'
                            ? 'bg-amber-500/15 text-amber-600'
                            : 'bg-muted text-muted-foreground'
                      }>
                        Visibilité : {matinaleData.activite_ansut.visibilite ?? 'Faible'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="email">
          {previewHtml ? (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Rendu email HTML</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="rounded-lg overflow-hidden border"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="glass">
              <CardContent className="py-8 text-center text-muted-foreground">
                Générez d'abord un aperçu pour voir le rendu email
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Derniers envois</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : !history || history.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  Aucun envoi de matinale enregistré
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Destinataires</TableHead>
                      <TableHead className="text-center">Envoyés</TableHead>
                      <TableHead className="text-center">Échoués</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
                        </TableCell>
                        <TableCell className="text-center">{log.destinataires_count}</TableCell>
                        <TableCell className="text-center">
                          <span className="flex items-center justify-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> {log.succes_count}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {log.echec_count > 0 ? (
                            <span className="flex items-center justify-center gap-1 text-destructive">
                              <XCircle className="h-3 w-3" /> {log.echec_count}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
