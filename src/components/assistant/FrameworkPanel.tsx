import { useMemo } from 'react';
import { Compass, CheckCircle2, Circle, Quote, FileText, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Panneau "Cadre d'analyse ANSUT"
 * Analyse la requête courante + la réponse en cours pour détecter :
 *  - Quelles dimensions du Service Universel sont activées (Accès / Usages / Impact)
 *  - Quels axes IA & Télécom sont mobilisés (Optimisation / Inclusion / Coûts / Souveraineté)
 *  - Quelles sections du format de sortie obligatoire ont été produites
 *  - Quelles citations [[ACTU:...]] / [[DOSSIER:...]] ont effectivement été utilisées
 */

interface Dimension {
  key: string;
  label: string;
  patterns: RegExp[];
}

const SERVICE_UNIVERSEL: Dimension[] = [
  { key: 'acces', label: 'Accès', patterns: [/acc[èe]s/i, /couvertur/i, /infrastructur/i, /zone[s]?\s+blanch/i, /fibre/i, /r[ée]seau/i, /d[ée]ploiement/i] },
  { key: 'usages', label: 'Usages', patterns: [/usage/i, /adoption/i, /service[s]?\s+num[ée]rique/i, /inclusion\s+num[ée]rique/i, /digital/i, /num[ée]risation/i] },
  { key: 'impact', label: 'Impact populations', patterns: [/impact/i, /population/i, /socio[\s-]?[ée]conomique/i, /inclusion/i, /b[ée]n[ée]ficia/i, /citoyen/i, /rural/i] },
];

const IA_TELECOM: Dimension[] = [
  { key: 'optim', label: 'Optimisation réseau', patterns: [/optim/i, /qos|qualit[ée]\s+de\s+service/i, /maintenance\s+pr[ée]dictive/i, /planification/i, /performance.*r[ée]seau/i] },
  { key: 'inclusion', label: 'Inclusion (voice-first)', patterns: [/voice[\s-]?first/i, /low[\s-]?literacy/i, /offline/i, /illettr/i, /vocal/i, /langues?\s+local/i] },
  { key: 'couts', label: 'Réduction coûts', patterns: [/co[ûu]t/i, /[ée]conomie/i, /efficienc/i, /rentabilit/i] },
  { key: 'souverainete', label: 'Souveraineté', patterns: [/souverainet[ée]/i, /donn[ée]es?\s+(locales?|nationales?)/i, /interop[ée]rabilit/i, /s[ée]curit[ée]\s+num[ée]rique/i, /cloud\s+souverain/i] },
];

const SECTIONS_FORMAT: Dimension[] = [
  { key: 'faits', label: 'Faits clés', patterns: [/faits?\s+cl[ée]s/i, /^#+\s*1\./im, /^[-•]\s+.*\[\[ACTU/im] },
  { key: 'innovation', label: 'Innovation IA identifiée', patterns: [/innovation\s+ia/i, /innovation.*intelligence/i] },
  { key: 'impact_su', label: 'Impact Service Universel', patterns: [/impact\s+(service\s+universel|su)/i, /^#+.*Acc[èe]s\s*:/im] },
  { key: 'risque', label: 'Risque / Opportunité', patterns: [/risque[s]?\s*\/?\s*opportunit/i, /opportunit[ée]/i] },
  { key: 'reco', label: 'Recommandation ANSUT', patterns: [/recommandation/i, /action\s+concr[èe]te/i, /^#+\s*5\./im] },
];

interface FrameworkPanelProps {
  query: string;          // dernière question utilisateur
  response: string;       // dernière réponse assistant (peut être en streaming)
  contextActuIds: string[];
  contextDossierIds: string[];
  contextActuTitles?: Record<string, string>;
  contextDossierTitles?: Record<string, string>;
}

function detectMatches(text: string, dims: Dimension[]): Set<string> {
  const hits = new Set<string>();
  for (const d of dims) {
    if (d.patterns.some((p) => p.test(text))) hits.add(d.key);
  }
  return hits;
}

function extractCitations(text: string, type: 'ACTU' | 'DOSSIER'): string[] {
  const re = new RegExp(`\\[\\[${type}:([0-9a-f-]{36})(?:\\|[^\\]]*)?\\]\\]`, 'gi');
  const ids: string[] = [];
  let m;
  while ((m = re.exec(text))) ids.push(m[1]);
  return Array.from(new Set(ids));
}

function DimensionRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs py-1">
      {active ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
      ) : (
        <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
      )}
      <span className={cn(active ? 'text-foreground font-medium' : 'text-muted-foreground/70')}>
        {label}
      </span>
    </div>
  );
}

export function FrameworkPanel({
  query,
  response,
  contextActuIds,
  contextDossierIds,
  contextActuTitles = {},
  contextDossierTitles = {},
}: FrameworkPanelProps) {
  const analysis = useMemo(() => {
    const haystack = `${query}\n\n${response}`;
    const suHits = detectMatches(haystack, SERVICE_UNIVERSEL);
    const iaHits = detectMatches(haystack, IA_TELECOM);
    const formatHits = detectMatches(response, SECTIONS_FORMAT);

    const usedActuIds = extractCitations(response, 'ACTU').filter((id) => contextActuIds.includes(id));
    const usedDossierIds = extractCitations(response, 'DOSSIER').filter((id) => contextDossierIds.includes(id));

    return { suHits, iaHits, formatHits, usedActuIds, usedDossierIds };
  }, [query, response, contextActuIds, contextDossierIds]);

  const totalSU = SERVICE_UNIVERSEL.length;
  const totalIA = IA_TELECOM.length;
  const totalFmt = SECTIONS_FORMAT.length;
  const isEmpty = !query && !response;

  return (
    <div className="bg-card rounded-2xl border shadow-sm flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm">Cadre d'analyse ANSUT</h3>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Service Universel + IA Télécom appliqués à la requête
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {isEmpty ? (
            <div className="text-center py-8">
              <Compass className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">
                Posez une question pour voir quelles dimensions du cadre ANSUT sont mobilisées.
              </p>
            </div>
          ) : (
            <>
              {/* Pilier 1 — Service Universel */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                    1. Service Universel
                  </h4>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {analysis.suHits.size}/{totalSU}
                  </Badge>
                </div>
                <div className="space-y-0.5">
                  {SERVICE_UNIVERSEL.map((d) => (
                    <DimensionRow key={d.key} label={d.label} active={analysis.suHits.has(d.key)} />
                  ))}
                </div>
              </section>

              {/* Pilier 2 — IA & Télécom */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                    2. IA & Communications
                  </h4>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {analysis.iaHits.size}/{totalIA}
                  </Badge>
                </div>
                <div className="space-y-0.5">
                  {IA_TELECOM.map((d) => (
                    <DimensionRow key={d.key} label={d.label} active={analysis.iaHits.has(d.key)} />
                  ))}
                </div>
              </section>

              {/* Sections produites */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    Sections produites
                  </h4>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {analysis.formatHits.size}/{totalFmt}
                  </Badge>
                </div>
                <div className="space-y-0.5">
                  {SECTIONS_FORMAT.map((d) => (
                    <DimensionRow key={d.key} label={d.label} active={analysis.formatHits.has(d.key)} />
                  ))}
                </div>
              </section>

              {/* Citations utilisées */}
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70 flex items-center gap-1.5 mb-2">
                  <Quote className="h-3 w-3" />
                  Sources citées
                </h4>
                {analysis.usedActuIds.length === 0 && analysis.usedDossierIds.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/70 italic">
                    Aucune citation détectée pour le moment.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {analysis.usedActuIds.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <BookOpen className="h-3 w-3 text-primary" />
                          <span className="text-[11px] font-medium">
                            Actualités ({analysis.usedActuIds.length}/{contextActuIds.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {analysis.usedActuIds.map((id) => (
                            <Tooltip key={id}>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-[10px] h-5 max-w-[180px] truncate cursor-help">
                                  {contextActuTitles[id] ?? id.slice(0, 8)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                <p className="text-xs">{contextActuTitles[id] ?? id}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.usedDossierIds.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <FileText className="h-3 w-3 text-primary" />
                          <span className="text-[11px] font-medium">
                            Dossiers ({analysis.usedDossierIds.length}/{contextDossierIds.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {analysis.usedDossierIds.map((id) => (
                            <Tooltip key={id}>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-[10px] h-5 max-w-[180px] truncate cursor-help">
                                  {contextDossierTitles[id] ?? id.slice(0, 8)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                <p className="text-xs">{contextDossierTitles[id] ?? id}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </ScrollArea>

      <div className="px-4 py-2 border-t bg-muted/20">
        <p className="text-[10px] text-muted-foreground text-center">
          Détection automatique basée sur la requête + réponse en cours
        </p>
      </div>
    </div>
  );
}
