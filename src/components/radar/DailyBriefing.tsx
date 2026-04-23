import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, RefreshCw, ShieldAlert, AlertCircle, Flag, CheckCircle, ExternalLink, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RelativeTime } from '@/components/ui/relative-time';
import { useDailyBriefing, type BriefingSource } from '@/hooks/useDailyBriefing';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/** Render inline citations [1], [2] inside a single line of text */
function InlineCitations({ text, sourcesMap }: { text: string; sourcesMap: Map<number, BriefingSource> }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          const source = sourcesMap.get(idx);
          if (source) {
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  {source.source_url ? (
                    <a
                      href={source.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center"
                    >
                      <Badge variant="outline" className="mx-0.5 text-[10px] px-1.5 py-0 cursor-pointer hover:bg-primary/10 border-primary/30 text-primary">
                        {idx}
                      </Badge>
                    </a>
                  ) : (
                    <Badge variant="outline" className="mx-0.5 text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground">
                      {idx}
                    </Badge>
                  )}
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium text-xs">{source.titre}</p>
                  <p className="text-[10px] text-muted-foreground">{source.source_nom}</p>
                </TooltipContent>
              </Tooltip>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/** Strip basic markdown emphasis (**bold**) inline */
function renderInline(text: string, sourcesMap: Map<number, BriefingSource>) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return segments.map((seg, i) => {
    const boldMatch = seg.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          <InlineCitations text={boldMatch[1]} sourcesMap={sourcesMap} />
        </strong>
      );
    }
    return <InlineCitations key={i} text={seg} sourcesMap={sourcesMap} />;
  });
}

/**
 * Format the briefing into structured blocks for readability.
 * Detects markdown headings, bullet lists, and paragraph breaks.
 * Falls back to splitting long single paragraphs into sentence groups.
 */
function BriefingText({ text, sources }: { text: string; sources: BriefingSource[] }) {
  const sourcesMap = useMemo(() => {
    const map = new Map<number, BriefingSource>();
    sources.forEach(s => map.set(s.index, s));
    return map;
  }, [sources]);

  const blocks = useMemo(() => {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    type Block =
      | { kind: 'heading'; level: 2 | 3; text: string }
      | { kind: 'list'; items: string[] }
      | { kind: 'paragraph'; text: string };
    const result: Block[] = [];
    let currentList: string[] | null = null;
    let currentPara: string[] | null = null;

    const flushList = () => {
      if (currentList && currentList.length) result.push({ kind: 'list', items: currentList });
      currentList = null;
    };
    const flushPara = () => {
      if (currentPara && currentPara.length) {
        const joined = currentPara.join(' ').trim();
        if (joined) result.push({ kind: 'paragraph', text: joined });
      }
      currentPara = null;
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { flushList(); flushPara(); continue; }

      const h3 = line.match(/^###\s+(.+)$/);
      const h2 = line.match(/^##\s+(.+)$/);
      const bullet = line.match(/^(?:[-*•]|\d+\.)\s+(.+)$/);

      if (h2) { flushList(); flushPara(); result.push({ kind: 'heading', level: 2, text: h2[1] }); continue; }
      if (h3) { flushList(); flushPara(); result.push({ kind: 'heading', level: 3, text: h3[1] }); continue; }
      if (bullet) {
        flushPara();
        if (!currentList) currentList = [];
        currentList.push(bullet[1]);
        continue;
      }
      flushList();
      if (!currentPara) currentPara = [];
      currentPara.push(line);
    }
    flushList();
    flushPara();

    // Fallback: long unique paragraph → split into ~2-sentence chunks
    if (result.length === 1 && result[0].kind === 'paragraph' && result[0].text.length > 280) {
      const para = result[0].text;
      const sentences = para.match(/[^.!?]+[.!?]+(\s|$)/g) || [para];
      const grouped: string[] = [];
      for (let i = 0; i < sentences.length; i += 2) {
        grouped.push(sentences.slice(i, i + 2).join('').trim());
      }
      return grouped.filter(Boolean).map((t) => ({ kind: 'paragraph' as const, text: t }));
    }

    return result;
  }, [text]);

  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        if (b.kind === 'heading') {
          return (
            <h3
              key={i}
              className={cn(
                'font-semibold',
                b.level === 2 ? 'text-base text-foreground mt-2' : 'text-sm text-primary/90 mt-1'
              )}
            >
              {renderInline(b.text, sourcesMap)}
            </h3>
          );
        }
        if (b.kind === 'list') {
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden />
                  <span className="flex-1">{renderInline(item, sourcesMap)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed">
            {renderInline(b.text, sourcesMap)}
          </p>
        );
      })}
    </div>
  );
}

export function DailyBriefing() {
  const {
    briefing,
    generatedAt,
    alertsCount,
    sources,
    isLoading,
    isGenerating,
    error,
    regenerate,
  } = useDailyBriefing();

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reported, setReported] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const handleReport = async () => {
    setIsReporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      await supabase.from('audit_consultations').insert({
        user_id: user.id,
        resource_type: 'briefing',
        action: 'report_error',
        metadata: {
          briefing_excerpt: briefing?.substring(0, 200),
          reason: reportReason,
          generated_at: generatedAt?.toISOString(),
        },
      });

      if (reportReason) {
        const { data: prefs } = await supabase
          .from('user_preferences_ia')
          .select('sujets_ignores')
          .eq('user_id', user.id)
          .maybeSingle();

        const existing = prefs?.sujets_ignores || [];
        const updated = [...new Set([...existing, reportReason])].slice(0, 20);
        await supabase.from('user_preferences_ia').upsert({
          user_id: user.id,
          sujets_ignores: updated,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }

      setReported(true);
      setReportOpen(false);
      setReportReason('');
      toast.success('Signalement enregistré. Le briefing sera amélioré.');
    } catch (err) {
      console.error('Report error:', err);
      toast.error("Impossible d'enregistrer le signalement");
    } finally {
      setIsReporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/20 animate-pulse" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  const displayBriefing = briefing || (error 
    ? "Le briefing n'a pas pu être généré. Le système de veille continue de surveiller les sources." 
    : "Aucune actualité récente. Le système de veille est actif.");

  return (
    <>
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                📍 Briefing du jour
              </h2>
              
              <div className="flex items-center gap-1">
                {generatedAt && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Généré <RelativeTime date={generatedAt} />
                  </span>
                )}

                {briefing && !reported && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setReportOpen(true)}
                    title="Signaler une erreur dans ce briefing"
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                )}
                {reported && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Signalé
                  </span>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => { setReported(false); regenerate(); }}
                  disabled={isGenerating}
                  title="Régénérer le briefing"
                >
                  <RefreshCw 
                    className={cn(
                      "h-4 w-4 text-muted-foreground",
                      isGenerating && "animate-spin"
                    )} 
                  />
                </Button>
              </div>
            </div>
            
            {/* Briefing content with inline source citations */}
            <div className={cn(
              "text-foreground leading-relaxed",
              isGenerating && "opacity-50"
            )}>
              <BriefingText text={displayBriefing} sources={sources} />
            </div>
            
            {/* Sources list */}
            {sources.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {sources.map((s) => (
                  <span key={s.index} className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {s.index}
                    </Badge>
                    {s.source_url ? (
                      <a
                        href={s.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary underline underline-offset-2 truncate max-w-[200px]"
                      >
                        {s.source_nom}
                        <ExternalLink className="inline h-2.5 w-2.5 ml-0.5" />
                      </a>
                    ) : (
                      <span className="truncate max-w-[200px]">{s.source_nom}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
            
            {alertsCount > 0 && (
              <p className="mt-3 text-signal-critical font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Attention : {alertsCount} alerte{alertsCount > 1 ? 's' : ''} critique{alertsCount > 1 ? 's' : ''} en cours.
              </p>
            )}
            
            {error && !briefing && (
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Service temporairement indisponible
              </p>
            )}
          </div>
        </div>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Signaler une erreur
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Décrivez brièvement ce qui est incorrect ou non pertinent. L'IA apprendra de votre retour.
          </p>
          <Textarea
            placeholder="Ex: L'inauguration des 20 sites ruraux n'a jamais eu lieu. / Les alertes cyber de routeurs ne me concernent pas."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReport}
              disabled={isReporting || !reportReason.trim()}
            >
              {isReporting ? 'Envoi…' : "Signaler & éduquer l'IA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
