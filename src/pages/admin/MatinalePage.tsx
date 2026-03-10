import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Newspaper, Send, Eye, Loader2, Zap, Target, MessageSquare,
  CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMatinalePreview, useMatinaleSend, useMatinaleHistory } from '@/hooks/useMatinale';

export default function MatinalePage() {
  const preview = useMatinalePreview();
  const send = useMatinaleSend();
  const { data: history, isLoading: historyLoading } = useMatinaleHistory();
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [matinaleData, setMatinaleData] = useState<any>(null);

  const handlePreview = async () => {
    const result = await preview.mutateAsync();
    setPreviewHtml(result.html || null);
    setMatinaleData(result.matinale);
  };

  const handleSend = async () => {
    await send.mutateAsync();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Newspaper className="h-8 w-8 text-primary" />
            La Matinale Com
          </h1>
          <p className="text-muted-foreground">
            Briefing quotidien automatique pour l'équipe Communication
          </p>
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
              {/* Flash Info */}
              <Card className="glass border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Flash Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {matinaleData.flash_info?.map((item: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 border-l-4 border-primary">
                      <p className="font-medium text-sm">{item.titre}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.resume}</p>
                      <p className="text-xs text-muted-foreground mt-1">— {item.source}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Veille Réputation */}
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Veille Réputation
                    <Badge className={
                      matinaleData.veille_reputation?.tonalite === 'positif'
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : matinaleData.veille_reputation?.tonalite === 'negatif'
                          ? 'bg-destructive/15 text-destructive'
                          : 'bg-amber-500/15 text-amber-600'
                    }>
                      {matinaleData.veille_reputation?.tonalite === 'positif' ? '✅ Positif'
                        : matinaleData.veille_reputation?.tonalite === 'negatif' ? '🔴 Négatif'
                          : '🟡 Neutre'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{matinaleData.veille_reputation?.resume}</p>
                  {matinaleData.veille_reputation?.mentions_cles?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {matinaleData.veille_reputation.mentions_cles.map((m: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Prêt-à-Poster */}
              <Card className="glass border-violet-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-violet-500" />
                    Prêt-à-Poster LinkedIn
                  </CardTitle>
                  <CardDescription>{matinaleData.pret_a_poster?.angle}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg bg-violet-500/5 border border-dashed border-violet-500/30">
                    <p className="text-sm whitespace-pre-line leading-relaxed">
                      {matinaleData.pret_a_poster?.linkedin}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      navigator.clipboard.writeText(matinaleData.pret_a_poster?.linkedin || '');
                      import('sonner').then(({ toast }) => toast.success('Post copié !'));
                    }}
                  >
                    Copier le post
                  </Button>
                </CardContent>
              </Card>
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
