import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Radio, Database, ShieldAlert, Users, TrendingUp, Activity, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CockpitStats {
  alertesCritiques: number;
  signauxFaibles: number;
  sourcesSurveillees: number;
  menacesReputation: number;
  acteursActifs: number;
  variations: number;
  niveauMenace: 'stable' | 'renforce' | 'critique';
  hotTopics: { label: string; intensity: number }[];
  timeline: { time: string; label: string; tone: 'info' | 'warn' | 'crit' }[];
}

function useCockpitStats() {
  return useQuery<CockpitStats>({
    queryKey: ['cockpit-surveillance-stats'],
    refetchInterval: 60000,
    queryFn: async () => {
      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

      const [alertesRes, signauxRes, sourcesRes, mentionsRes, acteursRes, actuRes, lastActu] = await Promise.all([
        supabase.from('alertes').select('id, niveau').gte('created_at', since24h),
        supabase.from('signaux').select('id, niveau, titre').eq('actif', true).gte('created_at', since7d),
        supabase.from('mots_cles_veille').select('id', { count: 'exact', head: true }).eq('actif', true),
        supabase.from('mentions').select('id, sentiment, est_critique').gte('created_at', since24h),
        supabase.from('personnalites').select('id', { count: 'exact', head: true }).eq('actif', true),
        supabase.from('actualites').select('tags, importance, sentiment').gte('created_at', since24h).limit(500),
        supabase.from('actualites').select('titre, created_at, importance').order('created_at', { ascending: false }).limit(6),
      ]);

      const alertesCritiques = (alertesRes.data ?? []).filter((a: any) => a.niveau === 'critique' || a.niveau === 'rouge').length;
      const signauxFaibles = (signauxRes.data ?? []).filter((s: any) => s.niveau === 'faible' || s.niveau === 'bleu' || s.niveau === 'vert').length;
      const sourcesSurveillees = sourcesRes.count ?? 0;
      const mentions = mentionsRes.data ?? [];
      const menacesReputation = mentions.filter((m: any) => m.est_critique || (m.sentiment != null && m.sentiment < -0.3)).length;
      const acteursActifs = acteursRes.count ?? 0;

      // Heatmap : top tags 24h
      const tagCount = new Map<string, number>();
      for (const a of actuRes.data ?? []) {
        for (const t of (a as any).tags ?? []) {
          const k = String(t).toLowerCase();
          if (k.length > 2) tagCount.set(k, (tagCount.get(k) ?? 0) + 1);
        }
      }
      const hotTopics = Array.from(tagCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, count]) => ({ label, intensity: Math.min(4, Math.ceil(count / 2)) }));

      // Variations inhabituelles : importance > 70
      const variations = (actuRes.data ?? []).filter((a: any) => (a.importance ?? 0) >= 70).length;

      // Niveau menace national
      let niveauMenace: CockpitStats['niveauMenace'] = 'stable';
      if (alertesCritiques >= 3 || menacesReputation >= 5) niveauMenace = 'critique';
      else if (alertesCritiques >= 1 || menacesReputation >= 2 || variations >= 5) niveauMenace = 'renforce';

      // Timeline temps réel
      const timeline = (lastActu.data ?? []).map((a: any) => {
        const d = new Date(a.created_at);
        const tone: 'info' | 'warn' | 'crit' = (a.importance ?? 0) >= 80 ? 'crit' : (a.importance ?? 0) >= 60 ? 'warn' : 'info';
        return {
          time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          label: a.titre,
          tone,
        };
      });

      return {
        alertesCritiques,
        signauxFaibles,
        sourcesSurveillees,
        menacesReputation,
        acteursActifs,
        variations,
        niveauMenace,
        hotTopics,
        timeline,
      };
    },
  });
}

const KpiCard = ({ icon: Icon, label, value, color, pulse }: { icon: any; label: string; value: number; color: string; pulse?: boolean }) => (
  <div className="relative bg-card/60 backdrop-blur border border-border/60 rounded-lg p-3 overflow-hidden group hover:border-primary/40 transition-colors">
    {pulse && value > 0 && (
      <span className="absolute top-2 right-2 flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-red-500" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
    )}
    <Icon className={cn('h-4 w-4 mb-1.5', color)} />
    <div className={cn('text-2xl font-bold tabular-nums', color)}>{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium leading-tight">{label}</div>
  </div>
);

const niveauConfig = {
  stable: { label: 'Stable', cls: 'bg-green-500/10 text-green-600 border-green-500/40 dark:text-green-400', dot: 'bg-green-500' },
  renforce: { label: 'Surveillance renforcée', cls: 'bg-orange-500/10 text-orange-600 border-orange-500/40 dark:text-orange-400', dot: 'bg-orange-500' },
  critique: { label: 'Critique', cls: 'bg-red-500/10 text-red-600 border-red-500/40 dark:text-red-400', dot: 'bg-red-500' },
};

export function CentreSurveillanceBar() {
  const { data, isLoading } = useCockpitStats();

  if (isLoading) {
    return <Skeleton className="h-44 w-full rounded-xl" />;
  }
  if (!data) return null;

  const niv = niveauConfig[data.niveauMenace];

  return (
    <div className="relative rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 overflow-hidden">
      {/* Effet radar subtil */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_30%_50%,_hsl(var(--primary)),_transparent_50%)]" />

      <div className="relative p-4 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Radio className="h-5 w-5 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Centre de Surveillance Numérique</h2>
              <p className="text-[11px] text-muted-foreground">Activité temps réel · 24 dernières heures</p>
            </div>
          </div>
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold', niv.cls)}>
            <span className={cn('h-2 w-2 rounded-full animate-pulse', niv.dot)} />
            État national : {niv.label}
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <KpiCard icon={AlertTriangle} label="Alertes critiques" value={data.alertesCritiques} color="text-red-600 dark:text-red-400" pulse />
          <KpiCard icon={Activity} label="Signaux faibles" value={data.signauxFaibles} color="text-amber-600 dark:text-amber-400" />
          <KpiCard icon={Database} label="Sources surveillées" value={data.sourcesSurveillees} color="text-blue-600 dark:text-blue-400" />
          <KpiCard icon={ShieldAlert} label="Menaces réputation" value={data.menacesReputation} color="text-orange-600 dark:text-orange-400" pulse />
          <KpiCard icon={Users} label="Acteurs actifs" value={data.acteursActifs} color="text-purple-600 dark:text-purple-400" />
          <KpiCard icon={TrendingUp} label="Variations inhab." value={data.variations} color="text-pink-600 dark:text-pink-400" />
        </div>

        {/* Heatmap + Timeline */}
        <div className="grid md:grid-cols-2 gap-3">
          {/* Sujets chauds */}
          <div className="bg-card/60 backdrop-blur border border-border/40 rounded-lg p-3">
            <h3 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Flame className="h-3 w-3 text-orange-500" />
              Sujets chauds
            </h3>
            {data.hotTopics.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun sujet dominant détecté.</p>
            ) : (
              <div className="space-y-1.5">
                {data.hotTopics.map(t => (
                  <div key={t.label} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-foreground/85 truncate">#{t.label}</span>
                    <span className="text-orange-500 tracking-tight shrink-0">
                      {Array.from({ length: t.intensity }).map((_, i) => '🔥').join('')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-card/60 backdrop-blur border border-border/40 rounded-lg p-3">
            <h3 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Radio className="h-3 w-3 text-primary" />
              Activité temps réel
            </h3>
            {data.timeline.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune activité récente.</p>
            ) : (
              <ul className="space-y-1">
                {data.timeline.slice(0, 5).map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 mt-0.5">{e.time}</span>
                    <span className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0 mt-1.5',
                      e.tone === 'crit' ? 'bg-red-500 animate-pulse' : e.tone === 'warn' ? 'bg-orange-500' : 'bg-blue-500'
                    )} />
                    <span className="text-foreground/85 truncate">{e.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
