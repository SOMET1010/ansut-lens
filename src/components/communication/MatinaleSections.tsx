import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle, Zap, Layers, Scale, Target, ListChecks,
  Shield, Radar, FileText, Building2, ExternalLink, Clock,
  CheckCircle2, XCircle, Lightbulb, MessageSquare, BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MatinaleDrillDownModal } from './MatinaleDrillDownModal';
import { MatinaleSectionShell, DrillButton, type SectionStatus } from './MatinaleSectionShell';

const RUBRIQUE_LABELS: Record<string, string> = {
  telecom_numerique: 'Télécom / Numérique',
  economie_finance: 'Économie / Finance',
  gouvernance_regulation: 'Gouvernance / Régulation',
  international: 'International',
};
const RUBRIQUE_ORDER = ['telecom_numerique', 'economie_finance', 'gouvernance_regulation', 'international'];

const PILIER_META: Record<string, { label: string; icon: any; color: string }> = {
  connectivite: { label: 'Connectivité & Infrastructures', icon: Radar, color: 'text-sky-600' },
  usages_services: { label: 'Usages & Services Numériques', icon: Layers, color: 'text-violet-600' },
  regulation_souverainete: { label: 'Régulation & Souveraineté', icon: Scale, color: 'text-emerald-600' },
  concurrence_marche: { label: 'Concurrence & Marché', icon: BarChart3, color: 'text-amber-600' },
};

function NiveauBadge({ niveau }: { niveau?: string }) {
  if (!niveau) return null;
  const map: Record<string, string> = {
    ROUGE: 'bg-red-500/15 text-red-600 border-red-500/30',
    ORANGE: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    VERT: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    BLEU: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    'ÉLEVÉ': 'bg-red-500/15 text-red-600 border-red-500/30',
    'MOYEN': 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    'FAIBLE': 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    'AUCUN': 'bg-muted text-muted-foreground',
  };
  return <Badge variant="outline" className={`${map[niveau] || ''} text-[10px] px-1.5 py-0 border`}>{niveau}</Badge>;
}

function isValidUrl(u?: string): boolean {
  if (!u) return false;
  try { const p = new URL(u); return p.protocol === 'http:' || p.protocol === 'https:'; } catch { return false; }
}

function formatDate(d?: string): string {
  if (!d) return '—';
  const p = new Date(d);
  if (isNaN(p.getTime())) return d;
  return format(p, 'dd MMM yyyy', { locale: fr });
}

interface Props {
  data: any;
  freshnessHours?: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function MatinaleSections({ data, freshnessHours = 24, loading = false, error = null, onRetry }: Props) {
  const safe = data || {};
  const prio = safe.priorite_executive;
  const synthese: any[] = safe.synthese_60s || [];
  const veille: Record<string, any[]> = safe.veille_par_pilier || {};
  const lectureStrat: any[] = safe.lecture_strategique || [];
  const impactProjets: any[] = safe.impact_projets_ansut || [];
  const actions: any[] = safe.actions_immediates || [];
  const reput = safe.reputation_ansut;
  const signaux: string[] = safe.signaux_faibles || [];
  const revue: any[] = safe.revue_de_presse || [];
  const activite = safe.activite_ansut;

  const [drill, setDrill] = useState<null | {
    title: string;
    description?: string;
    keywords: string[];
    highlightedTitles?: string[];
    analyzedItems?: { label: string; value?: string | number }[];
  }>(null);

  // Compute status per section
  const status = (hasData: boolean): SectionStatus => {
    if (loading) return 'loading';
    if (error) return 'error';
    return hasData ? 'ready' : 'empty';
  };

  const drillBtn = (payload: NonNullable<typeof drill>) => (
    <DrillButton onClick={() => setDrill(payload)} />
  );

  return (
    <div className="space-y-4">
      {/* 1. PRIORITÉ EXÉCUTIVE */}
      <MatinaleSectionShell
        icon={Zap}
        title="Priorité Exécutive"
        description={prio?.titre}
        cardClassName="glass border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-transparent"
        status={status(!!prio)}
        errorMessage={error || undefined}
        onRetry={onRetry}
        emptyHint="Aucune priorité exécutive identifiée. Les seuils peuvent être ajustés dans /admin/scoring."
        headerExtras={<>
          <NiveauBadge niveau={prio?.niveau} />
          {prio && <Badge variant="secondary" className="ml-auto text-xs">Arbitrage DG</Badge>}
        </>}
        rightActions={prio ? drillBtn({
          title: 'Priorité Exécutive',
          description: prio.titre,
          keywords: [prio.titre, ...(prio.impacts || [])].flatMap((s: string) => (s || '').split(/\s+/)).filter((w: string) => w.length > 4),
          highlightedTitles: [prio.titre].filter(Boolean),
          analyzedItems: [
            ...(prio.impacts || []).map((i: string) => ({ label: `Impact : ${i}` })),
            ...(prio.recommandation || []).map((r: string) => ({ label: `Reco : ${r}` })),
          ],
        }) : null}
      >
        <div className="space-y-3 text-sm">
          {prio?.impacts?.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">Impacts ANSUT</div>
              <ul className="space-y-1 list-disc list-inside">
                {prio.impacts.map((i: string, k: number) => <li key={k}>{i}</li>)}
              </ul>
            </div>
          )}
          {prio?.recommandation?.length > 0 && (
            <div className="rounded-lg bg-violet-500/5 border border-dashed border-violet-500/30 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-violet-600 mb-1.5">
                <Lightbulb className="h-3.5 w-3.5" /> Recommandations
              </div>
              <ul className="space-y-1 list-disc list-inside">
                {prio.recommandation.map((r: string, k: number) => <li key={k}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      </MatinaleSectionShell>

      {/* 2. SYNTHÈSE 60s */}
      <MatinaleSectionShell
        icon={Clock}
        title="Synthèse 60 secondes"
        status={status(synthese.length > 0)}
        errorMessage={error || undefined}
        onRetry={onRetry}
        emptyHint="Aucun sujet n'a passé le seuil de pertinence sur la fenêtre sélectionnée."
        headerExtras={synthese.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">{synthese.length} sujets</Badge>
        )}
        rightActions={synthese.length > 0 ? drillBtn({
          title: 'Synthèse 60 secondes',
          description: 'Articles sources des sujets de la synthèse',
          keywords: synthese.flatMap((s: any) => (s.sujet || '').split(/\s+/)).filter((w: string) => w.length > 4),
          highlightedTitles: synthese.map((s: any) => s.sujet).filter(Boolean),
          analyzedItems: synthese.map((s: any) => ({ label: s.sujet, value: s.niveau })),
        }) : null}
      >
        <div className="space-y-2">
          {synthese.map((s: any, i: number) => (
            <div key={i} className="flex items-start gap-3 p-2.5 rounded-md bg-muted/40 border border-border/50">
              <NiveauBadge niveau={s.niveau} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{s.sujet}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.impact_ansut}</p>
              </div>
            </div>
          ))}
        </div>
      </MatinaleSectionShell>

      {/* 3. VEILLE PAR PILIER */}
      <MatinaleSectionShell
        icon={Layers}
        title="Veille par pilier ANSUT"
        description="Connectivité · Usages · Régulation · Concurrence"
        status={status(Object.keys(veille).length > 0)}
        errorMessage={error || undefined}
        onRetry={onRetry}
        emptyHint="Aucun signal classé par pilier sur la fenêtre. Vérifiez les capteurs stratégiques."
        rightActions={Object.keys(veille).length > 0 ? drillBtn({
          title: 'Veille par pilier ANSUT',
          description: 'Articles sources tous piliers',
          keywords: Object.values(veille).flat().flatMap((it: any) => (it.titre || '').split(/\s+/)).filter((w: string) => w.length > 4),
          highlightedTitles: Object.values(veille).flat().map((it: any) => it.titre).filter(Boolean),
          analyzedItems: Object.entries(veille).flatMap(([k, items]: any) =>
            (items as any[]).map((it: any) => ({ label: `[${PILIER_META[k]?.label || k}] ${it.titre}`, value: it.niveau }))
          ),
        }) : null}
      >
        <div className="grid md:grid-cols-2 gap-3">
          {Object.entries(veille).map(([key, items]: [string, any]) => {
            const meta = PILIER_META[key] || { label: key, icon: Layers, color: 'text-primary' };
            const Icon = meta.icon;
            if (!Array.isArray(items) || items.length === 0) return null;
            return (
              <div key={key} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                  <span className="text-xs font-semibold uppercase">{meta.label}</span>
                </div>
                <ul className="space-y-2">
                  {items.map((it: any, i: number) => (
                    <li key={i} className="text-xs border-l-2 border-primary/40 pl-2">
                      <div className="flex items-start gap-1.5 flex-wrap">
                        {isValidUrl(it.url) ? (
                          <a href={it.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline inline-flex items-center gap-1">
                            {it.titre} <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                          </a>
                        ) : (
                          <span className="font-medium">{it.titre}</span>
                        )}
                        <NiveauBadge niveau={it.niveau} />
                      </div>
                      <p className="text-muted-foreground mt-0.5">{it.lecture_ansut}</p>
                      {it.source && <p className="text-[10px] text-muted-foreground/80 mt-0.5">{it.source}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </MatinaleSectionShell>

      {/* 4. LECTURE STRATÉGIQUE */}
      <MatinaleSectionShell
        icon={Target}
        title="Lecture stratégique"
        description="Sujets approfondis avec scores Service Universel"
        cardClassName="glass border-violet-500/30"
        status={status(lectureStrat.length > 0)}
        errorMessage={error || undefined}
        onRetry={onRetry}
        emptyHint="Pas de sujet d'approfondissement sur cette fenêtre. Élargissez la période d'analyse."
        rightActions={lectureStrat.length > 0 ? drillBtn({
          title: 'Lecture stratégique',
          keywords: lectureStrat.flatMap((s: any) => (s.sujet || '').split(/\s+/)).filter((w: string) => w.length > 4),
          highlightedTitles: lectureStrat.map((s: any) => s.sujet).filter(Boolean),
          analyzedItems: lectureStrat.flatMap((s: any) => [
            { label: `Sujet : ${s.sujet}` },
            ...(s.opportunites || []).map((o: string) => ({ label: `Opportunité : ${o}` })),
            ...(s.risques || []).map((r: string) => ({ label: `Risque : ${r}` })),
            ...(s.scores ? [{ label: 'Scores SU', value: `accès ${s.scores.acces ?? 0}/10 · usage ${s.scores.usage ?? 0}/10 · gouv ${s.scores.gouvernance ?? 0}/10 · souv ${s.scores.souverainete ?? 0}/10` }] : []),
          ]),
        }) : null}
      >
        <div className="space-y-4">
          {lectureStrat.map((s: any, i: number) => (
            <div key={i} className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <h4 className="font-semibold text-sm">{s.sujet}</h4>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                {s.opportunites?.length > 0 && (
                  <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-2">
                    <div className="text-[10px] font-semibold uppercase text-emerald-600 mb-1">Opportunités</div>
                    <ul className="list-disc list-inside space-y-0.5">{s.opportunites.map((o: string, k: number) => <li key={k}>{o}</li>)}</ul>
                  </div>
                )}
                {s.risques?.length > 0 && (
                  <div className="rounded-md bg-red-500/5 border border-red-500/20 p-2">
                    <div className="text-[10px] font-semibold uppercase text-red-600 mb-1">Risques</div>
                    <ul className="list-disc list-inside space-y-0.5">{s.risques.map((r: string, k: number) => <li key={k}>{r}</li>)}</ul>
                  </div>
                )}
              </div>
              {s.scores && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['acces', 'usage', 'gouvernance', 'souverainete'] as const).map(k => (
                    <div key={k} className="rounded-md bg-background border p-2">
                      <div className="text-[10px] uppercase text-muted-foreground capitalize">{k}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold">{s.scores[k] ?? 0}/10</span>
                      </div>
                      <Progress value={(s.scores[k] ?? 0) * 10} className="h-1 mt-1" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </MatinaleSectionShell>

      {/* 5. IMPACT PROJETS ANSUT */}
      <MatinaleSectionShell
        icon={Building2}
        title="Impact projets ANSUT"
        status={status(impactProjets.length > 0)}
        errorMessage={error || undefined}
        onRetry={onRetry}
        emptyHint="Aucun impact direct détecté sur les projets ANSUT pour cette fenêtre."
        rightActions={impactProjets.length > 0 ? drillBtn({
          title: 'Impact projets ANSUT',
          keywords: impactProjets.flatMap((p: any) => (p.domaine || '').split(/\s+/)).filter((w: string) => w.length > 3),
          highlightedTitles: impactProjets.map((p: any) => p.domaine).filter(Boolean),
          analyzedItems: impactProjets.map((p: any) => ({ label: `${p.domaine} — ${p.commentaire}`, value: p.impact })),
        }) : null}
      >
        <div className="space-y-2">
          {impactProjets.map((p: any, i: number) => (
            <div key={i} className="flex items-start gap-3 p-2.5 rounded-md bg-muted/40 border border-border/50">
              <NiveauBadge niveau={p.impact} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{p.domaine}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.commentaire}</p>
              </div>
            </div>
          ))}
        </div>
      </MatinaleSectionShell>

      {/* 6. ACTIONS IMMÉDIATES */}
      <MatinaleSectionShell
        icon={ListChecks}
        title="Actions immédiates"
        cardClassName="glass border-amber-500/30"
        status={status(actions.length > 0)}
        errorMessage={error || undefined}
        onRetry={onRetry}
        emptyHint="Aucune action prioritaire générée. Le contexte du jour ne nécessite pas d'arbitrage immédiat."
        rightActions={actions.length > 0 ? drillBtn({
          title: 'Actions immédiates',
          keywords: actions.flatMap((a: any) => (a.action || '').split(/\s+/)).filter((w: string) => w.length > 4),
          analyzedItems: actions.map((a: any, i: number) => ({ label: `${i + 1}. ${a.action}`, value: [a.responsable, a.delai].filter(Boolean).join(' · ') })),
        }) : null}
      >
        <ul className="space-y-2">
          {actions.map((a: any, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-primary font-bold shrink-0">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <p>{a.action}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {a.responsable && <Badge variant="outline" className="text-[10px]">{a.responsable}</Badge>}
                  {a.delai && <Badge variant="secondary" className="text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />{a.delai}</Badge>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </MatinaleSectionShell>

      {/* 7. RÉPUTATION ANSUT */}
      <MatinaleSectionShell
        icon={Shield}
        title="Réputation ANSUT"
        status={status(!!reput)}
        errorMessage={error || undefined}
        onRetry={onRetry}
        emptyHint="Aucun signal de réputation ANSUT détecté sur la fenêtre. Surveillance active."
        headerExtras={<NiveauBadge niveau={reput?.niveau_risque} />}
        rightActions={reput ? drillBtn({
          title: 'Réputation ANSUT',
          keywords: ['ANSUT', 'Service Universel'],
          analyzedItems: [
            ...((reput.positif || []).map((p: string) => ({ label: `Positif : ${p}` }))),
            ...((reput.negatif || []).map((n: string) => ({ label: `Négatif : ${n}` }))),
            ...(reput.confusion_role ? [{ label: `Confusion de rôle : ${reput.confusion_role}` }] : []),
          ],
        }) : null}
      >
        <div className="space-y-3 text-sm">
          <div className="grid md:grid-cols-2 gap-3">
            {reput?.positif?.length > 0 && (
              <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-3">
                <div className="text-[10px] font-semibold uppercase text-emerald-600 mb-1.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Signaux positifs
                </div>
                <ul className="text-xs list-disc list-inside space-y-0.5">{reput.positif.map((p: string, k: number) => <li key={k}>{p}</li>)}</ul>
              </div>
            )}
            {reput?.negatif?.length > 0 && (
              <div className="rounded-md bg-red-500/5 border border-red-500/20 p-3">
                <div className="text-[10px] font-semibold uppercase text-red-600 mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Signaux négatifs
                </div>
                <ul className="text-xs list-disc list-inside space-y-0.5">{reput.negatif.map((n: string, k: number) => <li key={k}>{n}</li>)}</ul>
              </div>
            )}
          </div>
          {reput?.confusion_role && (
            <div className="rounded-md bg-amber-500/5 border border-dashed border-amber-500/30 p-3 text-xs">
              <span className="font-semibold text-amber-600">Confusion de rôle détectée : </span>{reput.confusion_role}
            </div>
          )}
        </div>
      </MatinaleSectionShell>

      {/* 8. SIGNAUX FAIBLES */}
      <MatinaleSectionShell
        icon={Radar}
        title="Signaux faibles"
        description="Tendances émergentes à surveiller"
        cardClassName="glass border-blue-500/30"
        status={status(signaux.length > 0)}
        errorMessage={error || undefined}
        onRetry={onRetry}
        emptyHint="Aucun signal faible détecté. Les capteurs continuent de scanner les sources."
        headerExtras={signaux.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">{signaux.length}</Badge>
        )}
        rightActions={signaux.length > 0 ? drillBtn({
          title: 'Signaux faibles',
          description: 'Tendances émergentes à surveiller',
          keywords: signaux.flatMap((s: string) => s.split(/\s+/)).filter((w: string) => w.length > 4),
          analyzedItems: signaux.map((s: string) => ({ label: s })),
        }) : null}
      >
        <ul className="space-y-1.5">
          {signaux.map((s: string, i: number) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-blue-600 mt-1">◆</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </MatinaleSectionShell>

      {/* 9. REVUE DE PRESSE */}
      <MatinaleSectionShell
        icon={FileText}
        title="Revue de presse"
        description="Sources consultées — sans analyse"
        cardClassName="glass border-primary/20"
        status={status(revue.length > 0)}
        errorMessage={error || undefined}
        onRetry={onRetry}
        emptyHint="Aucune source consultée n'a été retenue (URLs invalides ou aucune publication récente)."
        headerExtras={revue.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">{revue.length} titres</Badge>
        )}
        rightActions={revue.length > 0 ? drillBtn({
          title: 'Revue de presse',
          description: 'Sources consultées',
          keywords: revue.flatMap((r: any) => (r.titre || '').split(/\s+/)).filter((w: string) => w.length > 4),
          highlightedTitles: revue.map((r: any) => r.titre).filter(Boolean),
          analyzedItems: revue.map((r: any) => ({ label: `[${r.rubrique || '—'}] ${r.titre}`, value: r.source })),
        }) : null}
      >
        <div className="space-y-4">
          {RUBRIQUE_ORDER.map((rub) => {
            const items = revue.filter((r: any) => r.rubrique === rub);
            if (!items.length) return null;
            return (
              <div key={rub}>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{RUBRIQUE_LABELS[rub]}</h4>
                <ul className="space-y-2">
                  {items.map((it: any, i: number) => {
                    const ok = isValidUrl(it.url);
                    return (
                      <li key={i} className="text-sm border-l-2 border-primary/40 pl-3">
                        <div className="flex items-start gap-2 flex-wrap">
                          {ok ? (
                            <a href={it.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline inline-flex items-center gap-1">
                              {it.titre} <ExternalLink className="h-3 w-3 opacity-60" />
                            </a>
                          ) : (
                            <span className="font-medium text-muted-foreground">{it.titre}</span>
                          )}
                          <Badge variant="outline" className={`gap-1 text-[10px] px-1.5 py-0 ${ok ? 'border-emerald-500/40 text-emerald-600' : 'border-destructive/40 text-destructive'}`}>
                            {ok ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                            {ok ? 'URL valide' : 'URL invalide'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <span>{it.source}</span><span>·</span>
                          <Clock className="h-3 w-3" /><span>{formatDate(it.date)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </MatinaleSectionShell>

      {/* ACTIVITÉ ANSUT */}
      <MatinaleSectionShell
        icon={BarChart3}
        title="Activité ANSUT"
        status={status(!!activite)}
        errorMessage={error || undefined}
        onRetry={onRetry}
        emptyHint="Aucune publication institutionnelle ANSUT détectée sur la fenêtre."
      >
        <div className="flex gap-3 flex-wrap">
          <Badge variant="secondary" className="gap-1">
            <MessageSquare className="h-3 w-3" />
            {activite?.publications_count ?? 0} publication(s)
          </Badge>
          <Badge className={
            activite?.visibilite === 'Fort' ? 'bg-emerald-500/15 text-emerald-600'
            : activite?.visibilite === 'Moyen' ? 'bg-amber-500/15 text-amber-600'
            : 'bg-muted text-muted-foreground'
          }>
            Visibilité : {activite?.visibilite ?? 'Faible'}
          </Badge>
        </div>
      </MatinaleSectionShell>

      {drill && (
        <MatinaleDrillDownModal
          open={!!drill}
          onOpenChange={(o) => !o && setDrill(null)}
          title={drill.title}
          description={drill.description}
          keywords={drill.keywords}
          highlightedTitles={drill.highlightedTitles}
          analyzedItems={drill.analyzedItems}
          freshnessHours={freshnessHours}
        />
      )}
    </div>
  );
}
