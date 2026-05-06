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
  FileText, ListChecks, Building2, AlertTriangle, Lightbulb, BarChart3, ExternalLink, Download,
} from 'lucide-react';
import { exportMatinalePDF } from '@/utils/exportMatinalePDF';
import { toast } from 'sonner';

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
import { MatinaleSections } from '@/components/communication/MatinaleSections';

export default function MatinalePage() {
  const preview = useMatinalePreview();
  const send = useMatinaleSend();
  const { data: history, isLoading: historyLoading } = useMatinaleHistory();
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [matinaleData, setMatinaleData] = useState<import('@/types/matinale').MatinaleData | null>(null);
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
            variant="outline"
            onClick={handleExportPDF}
            disabled={!matinaleData}
            title={!matinaleData ? 'Générez d\'abord un aperçu' : 'Exporter le briefing en PDF'}
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter PDF
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
          {!matinaleData && !preview.isPending && !preview.isError && (
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

          {(matinaleData || preview.isPending || preview.isError) && (
            <MatinaleSections
              data={matinaleData || {}}
              freshnessHours={freshness}
              loading={preview.isPending}
              error={preview.isError ? (preview.error as Error)?.message || 'Erreur de génération' : null}
              onRetry={handlePreview}
            />
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
