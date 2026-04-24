import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, RefreshCw, ShieldAlert, AlertCircle, Flag, CheckCircle,
  ExternalLink, ChevronRight, Target, Lightbulb, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RelativeTime } from '@/components/ui/relative-time';
import { useDailyBriefing, type BriefingSource } from '@/hooks/useDailyBriefing';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip, TooltipContent, TooltipTrigger,
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
                    <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
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
 * Parse the briefing into 3 decisional sections for DG/CODIR view:
 *  - "À retenir"   (key facts, 3 short bullets max)
 *  - "Impact SU"   (Service Universel implications)
 *  - "Recommandation ANSUT" (proposed action — strong call-out)
 *
 * Heuristic-based: leverages existing markdown structure, falls back gracefully.
 */
type ParsedBriefing = {
  retenir: string[];
  impact: string[];
  recommandation: string[];
  raw: string; // fallback when nothing structured detected
};

function parseBriefing(text: string): ParsedBriefing {
  const out: ParsedBriefing = { retenir: [], impact: [], recommandation: [], raw: '' };
  if (!text?.trim()) return out;

  const normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  // Section detection by heading or keyword
  type Section = 'retenir' | 'impact' | 'recommandation' | null;
  let current: Section = null;
  const buckets: Record<Exclude<Section, null>, string[]> = {
    retenir: [], impact: [], recommandation: [],
  };
  const leftover: string[] = [];

  const detectSection = (line: string): Section => {
    const l = line.toLowerCase().replace(/^#+\s*/, '').replace(/[*:_]/g, '').trim();
    if (/^(à\s*retenir|a\s*retenir|points?\s*cl[ée]s?|faits?\s*marquants?|essentiel)/.test(l)) return 'retenir';
    if (/^(impact|impacts?\s*(service\s*universel|su|ansut)|enjeux?)/.test(l)) return 'impact';
    if (/^(recommandation|reco|action\s*propos[ée]e?|que\s*faire)/.test(l)) return 'recommandation';
    return null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const heading = line.match(/^#{1,4}\s+(.+)$/);
    const sectionFromHeading = heading ? detectSection(heading[1]) : null;
    if (sectionFromHeading) { current = sectionFromHeading; continue; }
    if (heading && !sectionFromHeading) { current = null; leftover.push(heading[1]); continue; }

    // Inline "Recommandation ANSUT : ..." pattern (single line)
    const inlineReco = line.match(/^\**\s*recommandation\s+ansut\s*\**\s*[:\-–]\s*(.+)$/i);
    if (inlineReco) { buckets.recommandation.push(inlineReco[1].trim()); current = 'recommandation'; continue; }

    const bullet = line.match(/^(?:[-*•]|\d+\.)\s+(.+)$/);
    const content = bullet ? bullet[1] : line;

    if (current) {
      buckets[current].push(content);
    } else {
      leftover.push(content);
    }
  }

  out.retenir = buckets.retenir.slice(0, 4);
  out.impact = buckets.impact.slice(0, 4);
  out.recommandation = buckets.recommandation.slice(0, 3);

  // Fallback: nothing structured detected → split unstructured prose into ≤3 short retenir items
  if (!out.retenir.length && !out.impact.length && !out.recommandation.length && leftover.length) {
    const joined = leftover.join(' ').trim();
    // Try to split off a trailing recommendation
    const recoMatch = joined.match(/(.*?)(recommandation\s+ansut\s*[:\-–]\s*)([\s\S]+)$/i);
    let body = joined;
    if (recoMatch) {
      body = recoMatch[1].trim();
      out.recommandation = [recoMatch[3].trim()];
    }
    const sentences = body.match(/[^.!?]+[.!?]+(?:\s*\[\d+\])*/g) || [body];
    out.retenir = sentences.slice(0, 3).map(s => s.trim()).filter(Boolean);
    if (!out.retenir.length) out.raw = joined;
  }

  return out;
}

function CitedItem({
  text, sourcesMap, dotClass, detailHref, detailLabel,
}: {
  text: string;
  sourcesMap: Map<number, BriefingSource>;
  dotClass: string;
  detailHref?: string;
  detailLabel?: string;
}) {
  return (
    <li className="group flex gap-2.5 text-sm leading-relaxed">
      <span className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', dotClass)} aria-hidden />
      <span className="flex-1">
        {renderInline(text, sourcesMap)}
        {detailHref && (
          <Link
            to={detailHref}
            aria-label={detailLabel || 'Voir le détail'}
            className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-primary/80 hover:text-primary hover:underline underline-offset-2 align-baseline opacity-70 group-hover:opacity-100 transition-opacity"
          >
            Voir le détail<ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </span>
    </li>
  );
}

export function DailyBriefing() {
  const {
    briefing, generatedAt, alertsCount, sources,
    isLoading, isGenerating, error, regenerate,
  } = useDailyBriefing();

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reported, setReported] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);

  const sourcesMap = useMemo(() => {
    const m = new Map<number, BriefingSource>();
    sources.forEach(s => m.set(s.index, s));
    return m;
  }, [sources]);

  const parsed = useMemo(() => parseBriefing(briefing || ''), [briefing]);

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
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 border border-primary/20">
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  const hasContent = parsed.retenir.length || parsed.impact.length || parsed.recommandation.length || parsed.raw;
  const visibleSources = showAllSources ? sources : sources.slice(0, 3);
  const extraSources = Math.max(0, sources.length - 3);

  return (
    <>
      <section
        className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card overflow-hidden"
        aria-label="Briefing décisionnel du jour"
      >
        {/* === 1. BANDEAU DÉCISIONNEL === */}
        <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/40 bg-card/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/15 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground leading-tight">Briefing du jour</h2>
              {generatedAt && (
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Généré <RelativeTime date={generatedAt} />
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {briefing && !reported && (
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => setReportOpen(true)}
                title="Signaler une erreur"
              >
                <Flag className="h-3.5 w-3.5" />
              </Button>
            )}
            {reported && (
              <span className="flex items-center gap-1 text-[11px] text-primary px-1">
                <CheckCircle className="h-3 w-3" /> Signalé
              </span>
            )}
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => { setReported(false); regenerate(); }}
              disabled={isGenerating}
              title="Régénérer"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 text-muted-foreground', isGenerating && 'animate-spin')} />
            </Button>
          </div>
        </header>

        <div className={cn('p-5 space-y-5', isGenerating && 'opacity-60')}>
          {/* === 2. ALERTE CRITIQUE (priorité maximale, en haut) === */}
          {alertsCount > 0 && (
            <Link
              to="/alertes"
              className="group flex items-center gap-3 rounded-lg border-2 border-signal-critical/40 bg-signal-critical/10 px-4 py-3 transition-all hover:bg-signal-critical/15 hover:border-signal-critical/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-critical"
              aria-label={`Voir les ${alertsCount} alertes critiques`}
            >
              <ShieldAlert className="h-5 w-5 text-signal-critical shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-signal-critical leading-tight">
                  Attention — {alertsCount} alerte{alertsCount > 1 ? 's' : ''} critique{alertsCount > 1 ? 's' : ''}
                </p>
                <p className="text-[11px] text-signal-critical/80 mt-0.5">Action requise · cliquez pour agir</p>
              </div>
              <ChevronRight className="h-4 w-4 text-signal-critical/70 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}

          {/* === 3. À RETENIR === */}
          {parsed.retenir.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">À retenir</h3>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-muted-foreground hover:text-primary">
                  <Link to="/actualites" aria-label="Voir le détail des actualités">
                    Voir le détail <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Link>
                </Button>
              </div>
              <ul className="space-y-2">
                {parsed.retenir.map((item, i) => (
                  <CitedItem key={i} text={item} sourcesMap={sourcesMap} dotClass="bg-primary" />
                ))}
              </ul>
            </div>
          )}

          {/* === 4. IMPACT SERVICE UNIVERSEL === */}
          {parsed.impact.length > 0 && (
            <div className="rounded-lg bg-muted/40 border border-border/50 p-4">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-foreground/70" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">Impact Service Universel</h3>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-foreground/70 hover:text-foreground">
                  <Link to="/radar" aria-label="Voir le détail de l'impact Service Universel">
                    Voir le détail <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Link>
                </Button>
              </div>
              <ul className="space-y-2">
                {parsed.impact.map((item, i) => (
                  <CitedItem key={i} text={item} sourcesMap={sourcesMap} dotClass="bg-foreground/50" />
                ))}
              </ul>
            </div>
          )}

          {/* === 5. RECOMMANDATION ANSUT (zone décisionnelle forte) === */}
          {parsed.recommandation.length > 0 && (
            <div className="rounded-lg border-2 border-primary/30 bg-primary/[0.07] p-4">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Recommandation ANSUT</h3>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-primary hover:bg-primary/10">
                  <Link to="/dossiers" aria-label="Voir le détail des recommandations ANSUT">
                    Voir le détail <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Link>
                </Button>
              </div>
              <ul className="space-y-2">
                {parsed.recommandation.map((item, i) => (
                  <CitedItem key={i} text={item} sourcesMap={sourcesMap} dotClass="bg-primary" />
                ))}
              </ul>
            </div>
          )}

          {/* Fallback prose (only if parser couldn't structure anything) */}
          {!hasContent && (
            <p className="text-sm text-muted-foreground italic">
              {error ? "Le briefing n'a pas pu être généré. Le système de veille reste actif." : 'Aucune actualité majeure à signaler.'}
            </p>
          )}
          {parsed.raw && (
            <p className="text-sm leading-relaxed">{renderInline(parsed.raw, sourcesMap)}</p>
          )}

          {/* === 6. SOURCES (réduites, repliables) === */}
          {sources.length > 0 && (
            <div className="pt-3 border-t border-border/40">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">Sources</span>
                {visibleSources.map((s) => (
                  <span key={s.index} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{s.index}</Badge>
                    {s.source_url ? (
                      <a
                        href={s.source_url} target="_blank" rel="noopener noreferrer"
                        className="hover:text-primary underline-offset-2 hover:underline truncate max-w-[160px]"
                      >
                        {s.source_nom}
                        <ExternalLink className="inline h-2.5 w-2.5 ml-0.5" />
                      </a>
                    ) : (
                      <span className="truncate max-w-[160px]">{s.source_nom}</span>
                    )}
                  </span>
                ))}
                {!showAllSources && extraSources > 0 && (
                  <button
                    onClick={() => setShowAllSources(true)}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    +{extraSources} source{extraSources > 1 ? 's' : ''}
                  </button>
                )}
                {showAllSources && sources.length > 3 && (
                  <button
                    onClick={() => setShowAllSources(false)}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    réduire
                  </button>
                )}
              </div>
            </div>
          )}

          {error && !briefing && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Service temporairement indisponible
            </p>
          )}
        </div>
      </section>

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
            placeholder="Ex: L'inauguration des 20 sites ruraux n'a jamais eu lieu."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleReport} disabled={isReporting || !reportReason.trim()}>
              {isReporting ? 'Envoi…' : "Signaler & éduquer l'IA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
