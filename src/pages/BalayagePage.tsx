import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Satellite,
  Globe,
  Newspaper,
  GraduationCap,
  MessagesSquare,
  Twitter,
  Cloud,
  Youtube,
  Linkedin,
  Music2,
  Flame,
  Github,
  Landmark,
  BookOpen,
  Signal,
  ExternalLink,
  Copy,
  Radio,
  FileDown,
  PlayCircle,
  CheckCheck,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type WindowDays = 7 | 30 | 90;
type Precision = 'exacte' | 'approx' | 'sans date';
type Category = 'Web & presse' | 'Réseaux sociaux' | 'Tech & signaux' | 'Contexte ANSUT';

interface BuildCtx {
  terms: string;      // sujet + exclusions (déjà quoté si phrase exacte)
  date: string;       // YYYY-MM-DD
  year: string;
  days: WindowDays;
  minEngagement: number;
}

interface SourceDef {
  id: string;
  name: string;
  icon: typeof Globe;
  category: Category;
  precision: Precision;
  defaultOn: boolean;
  /** requête lisible affichée à l'utilisateur */
  query: (c: BuildCtx) => string;
  url: (c: BuildCtx) => string;
}

const CATEGORIES: Category[] = ['Web & presse', 'Réseaux sociaux', 'Tech & signaux', 'Contexte ANSUT'];

const REDDIT_T: Record<WindowDays, string> = { 7: 'week', 30: 'month', 90: 'year' };
const YT_SP: Record<WindowDays, string> = { 7: 'EgIIAw==', 30: 'EgIIBA==', 90: 'EgIIBQ==' };
const HN_RANGE: Record<WindowDays, string> = { 7: 'pastWeek', 30: 'pastMonth', 90: 'pastYear' };

const SOURCES: SourceDef[] = [
  // ---------- Web & presse ----------
  {
    id: 'google',
    name: 'Google',
    icon: Globe,
    category: 'Web & presse',
    precision: 'exacte',
    defaultOn: true,
    query: (c) => `${c.terms} after:${c.date}`,
    url: (c) => `https://www.google.com/search?q=${encodeURIComponent(`${c.terms} after:${c.date}`)}`,
  },
  {
    id: 'google-news',
    name: 'Google Actualités',
    icon: Newspaper,
    category: 'Web & presse',
    precision: 'exacte',
    defaultOn: true,
    query: (c) => `${c.terms} after:${c.date}`,
    url: (c) =>
      `https://news.google.com/search?q=${encodeURIComponent(`${c.terms} after:${c.date}`)}&hl=fr`,
  },
  {
    id: 'scholar',
    name: 'Google Scholar',
    icon: GraduationCap,
    category: 'Web & presse',
    precision: 'approx',
    defaultOn: false,
    query: (c) => `${c.terms} · depuis ${c.year}`,
    url: (c) =>
      `https://scholar.google.com/scholar?q=${encodeURIComponent(c.terms)}&as_ylo=${c.year}&scisbd=1`,
  },

  // ---------- Réseaux sociaux ----------
  {
    id: 'reddit',
    name: 'Reddit',
    icon: MessagesSquare,
    category: 'Réseaux sociaux',
    precision: 'approx',
    defaultOn: true,
    query: (c) => `${c.terms} · sort:new · t=${REDDIT_T[c.days]}`,
    url: (c) =>
      `https://www.reddit.com/search/?q=${encodeURIComponent(c.terms)}&sort=new&t=${REDDIT_T[c.days]}`,
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    icon: Twitter,
    category: 'Réseaux sociaux',
    precision: 'exacte',
    defaultOn: true,
    query: (c) =>
      `${c.terms} since:${c.date}${c.minEngagement > 0 ? ` min_faves:${c.minEngagement}` : ''}`,
    url: (c) =>
      `https://x.com/search?q=${encodeURIComponent(
        `${c.terms} since:${c.date}${c.minEngagement > 0 ? ` min_faves:${c.minEngagement}` : ''}`
      )}&f=live`,
  },
  {
    id: 'bluesky',
    name: 'Bluesky',
    icon: Cloud,
    category: 'Réseaux sociaux',
    precision: 'exacte',
    defaultOn: true,
    query: (c) => `${c.terms} since:${c.date}`,
    url: (c) => `https://bsky.app/search?q=${encodeURIComponent(`${c.terms} since:${c.date}`)}`,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    category: 'Réseaux sociaux',
    precision: 'approx',
    defaultOn: true,
    query: (c) => `${c.terms} · filtre ${c.days} j`,
    url: (c) =>
      `https://www.youtube.com/results?search_query=${encodeURIComponent(c.terms)}&sp=${encodeURIComponent(
        YT_SP[c.days]
      )}`,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    category: 'Réseaux sociaux',
    precision: 'approx',
    defaultOn: false,
    query: (c) => `${c.terms} · ${c.days === 7 ? 'past-week' : 'past-month'}`,
    url: (c) =>
      `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(
        c.terms
      )}&datePosted=%22${c.days === 7 ? 'past-week' : 'past-month'}%22&sortBy=%22date_posted%22`,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Music2,
    category: 'Réseaux sociaux',
    precision: 'sans date',
    defaultOn: false,
    query: (c) => c.terms,
    url: (c) => `https://www.tiktok.com/search?q=${encodeURIComponent(c.terms)}`,
  },

  // ---------- Tech & signaux ----------
  {
    id: 'hn',
    name: 'Hacker News',
    icon: Flame,
    category: 'Tech & signaux',
    precision: 'approx',
    defaultOn: true,
    query: (c) => `${c.terms} · ${HN_RANGE[c.days]}`,
    url: (c) =>
      `https://hn.algolia.com/?query=${encodeURIComponent(c.terms)}&sort=byDate&dateRange=${
        HN_RANGE[c.days]
      }&type=story`,
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: Github,
    category: 'Tech & signaux',
    precision: 'exacte',
    defaultOn: true,
    query: (c) => `${c.terms} pushed:>${c.date}`,
    url: (c) =>
      `https://github.com/search?q=${encodeURIComponent(
        `${c.terms} pushed:>${c.date}`
      )}&type=repositories&s=updated&o=desc`,
  },

  // ---------- Contexte ANSUT ----------
  {
    id: 'artci',
    name: 'ARTCI — régulateur',
    icon: Landmark,
    category: 'Contexte ANSUT',
    precision: 'exacte',
    defaultOn: false,
    query: (c) => `${c.terms} site:artci.ci after:${c.date}`,
    url: (c) =>
      `https://www.google.com/search?q=${encodeURIComponent(
        `${c.terms} site:artci.ci after:${c.date}`
      )}`,
  },
  {
    id: 'presse-ci',
    name: 'Presse Côte d’Ivoire',
    icon: BookOpen,
    category: 'Contexte ANSUT',
    precision: 'exacte',
    defaultOn: false,
    query: (c) =>
      `${c.terms} (site:fratmat.info OR site:linfodrome.com OR site:koaci.com) after:${c.date}`,
    url: (c) =>
      `https://www.google.com/search?q=${encodeURIComponent(
        `${c.terms} (site:fratmat.info OR site:linfodrome.com OR site:koaci.com) after:${c.date}`
      )}`,
  },
  {
    id: 'operateurs',
    name: 'Opérateurs télécom',
    icon: Signal,
    category: 'Contexte ANSUT',
    precision: 'exacte',
    defaultOn: false,
    query: (c) => `${c.terms} (Orange OR MTN OR Moov) Cote d'Ivoire after:${c.date}`,
    url: (c) =>
      `https://www.google.com/search?q=${encodeURIComponent(
        `${c.terms} (Orange OR MTN OR Moov) Cote d'Ivoire after:${c.date}`
      )}`,
  },
];

const SUGGESTIONS = [
  'service universel telecom',
  'couverture reseau Cote d’Ivoire',
  'ARTCI',
  'fracture numerique',
  'fibre optique',
];

const RECENTS_KEY = 'ansut.balayage.recents';
const MAX_RECENTS = 12;

const precisionStyles: Record<Precision, string> = {
  exacte: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  approx: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  'sans date': 'bg-muted text-muted-foreground border-border',
};

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function copyText(value: string, message: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  } catch {
    toast.error('Copie impossible dans ce navigateur');
  }
}

export default function BalayagePage() {
  const [subject, setSubject] = useState('');
  const [armedSubject, setArmedSubject] = useState('');
  const [days, setDays] = useState<WindowDays>(30);
  const [exactPhrase, setExactPhrase] = useState(false);
  const [exclusions, setExclusions] = useState('');
  const [minEngagement, setMinEngagement] = useState(0);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SOURCES.map((s) => [s.id, s.defaultOn]))
  );
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecents(parsed.filter((v) => typeof v === 'string').slice(0, MAX_RECENTS));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const pushRecent = useCallback((value: string) => {
    setRecents((prev) => {
      const next = [value, ...prev.filter((v) => v !== value)].slice(0, MAX_RECENTS);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const ctx: BuildCtx | null = useMemo(() => {
    const base = armedSubject.trim();
    if (!base) return null;
    const core = exactPhrase ? `"${base}"` : base;
    const excl = exclusions
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => ` -${t}`)
      .join('');
    const date = isoDaysAgo(days);
    return {
      terms: `${core}${excl}`,
      date,
      year: date.slice(0, 4),
      days,
      minEngagement: Number.isFinite(minEngagement) ? Math.max(0, minEngagement) : 0,
    };
  }, [armedSubject, exactPhrase, exclusions, days, minEngagement]);

  const activeSources = useMemo(() => SOURCES.filter((s) => enabled[s.id]), [enabled]);

  const arm = useCallback(
    (value?: string) => {
      const target = (value ?? subject).trim();
      if (!target) {
        toast.error('Renseignez un sujet avant d’armer le balayage');
        return;
      }
      setSubject(target);
      setArmedSubject(target);
      pushRecent(target);
      toast.success(`Balayage armé sur « ${target} »`);
    },
    [subject, pushRecent]
  );

  const buildLinks = useCallback(() => {
    if (!ctx) return [] as { name: string; url: string }[];
    return activeSources.map((s) => ({ name: s.name, url: s.url(ctx) }));
  }, [ctx, activeSources]);

  const openSelection = useCallback(() => {
    if (!ctx) return;
    const links = buildLinks();
    if (links.length === 0) {
      toast.error('Aucune source active');
      return;
    }
    window.open(links[0].url, '_blank', 'noopener,noreferrer');
    links.slice(1).forEach((l, i) => {
      window.setTimeout(() => window.open(l.url, '_blank', 'noopener,noreferrer'), (i + 1) * 350);
    });
    toast.info(`Ouverture de ${links.length} onglet(s)`, {
      description: 'Autorisez les fenêtres pop-up pour ce site si certains onglets manquent.',
    });
  }, [ctx, buildLinks]);

  const hasResults = !!ctx;

  return (
    <div className="p-4 md:p-6 space-y-6 motion-reduce:transition-none">
      {/* En-tête */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Satellite className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Balayage 30 jours</h1>
            <p className="text-sm text-muted-foreground">
              Un sujet, toutes les sources — liens de recherche réels, aucun résultat fabriqué.
            </p>
          </div>
          <Badge variant="outline" className="ml-auto font-mono text-[11px] border-primary/40 text-primary">
            SIGNAL v1 · un sujet, toutes les sources, 30 derniers jours
          </Badge>
        </div>
      </header>

      {/* Console d'armement */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" aria-hidden="true" />
            Console de balayage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="balayage-sujet">Sujet</Label>
              <Input
                id="balayage-sujet"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') arm();
                }}
                placeholder="Ex. service universel telecom"
                className="h-12 text-base"
                aria-label="Sujet à balayer"
              />
            </div>
            <div className="flex items-end">
              <Button size="lg" className="h-12 gap-2 w-full sm:w-auto" onClick={() => arm()}>
                <Satellite className="h-4 w-4" aria-hidden="true" />
                Armer
              </Button>
            </div>
          </div>

          {/* Options */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label id="balayage-fenetre-label">Fenêtre</Label>
              <div
                role="group"
                aria-labelledby="balayage-fenetre-label"
                className="inline-flex rounded-md border border-border p-0.5 bg-muted/30"
              >
                {([7, 30, 90] as WindowDays[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    aria-pressed={days === d}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-[5px] transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      days === d
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {d} j
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="balayage-exact">Phrase exacte</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch id="balayage-exact" checked={exactPhrase} onCheckedChange={setExactPhrase} />
                <span className="text-sm text-muted-foreground">
                  {exactPhrase ? 'Activée' : 'Désactivée'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="balayage-exclusions">Exclure des termes</Label>
              <Input
                id="balayage-exclusions"
                value={exclusions}
                onChange={(e) => setExclusions(e.target.value)}
                placeholder="recrutement, offre"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="balayage-engagement">Engagement min (X)</Label>
              <Input
                id="balayage-engagement"
                type="number"
                min={0}
                value={minEngagement}
                onChange={(e) => setMinEngagement(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Suggestions & récents */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Suggestions</span>
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  variant="secondary"
                  size="sm"
                  className="h-7 rounded-full text-xs"
                  onClick={() => arm(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
            {recents.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <History className="h-3 w-3" aria-hidden="true" /> Récents
                </span>
                {recents.map((r) => (
                  <Button
                    key={r}
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full text-xs"
                    onClick={() => arm(r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!hasResults ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-2">
            <Satellite className="h-8 w-8 mx-auto text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Saisissez un sujet et cliquez sur « Armer » pour générer les requêtes par plateforme.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Barre d'actions */}
          <div className="flex flex-wrap items-center gap-2 sticky top-0 z-10 bg-background/80 backdrop-blur py-2">
            <Badge variant="secondary" className="mr-1">
              {activeSources.length} / {SOURCES.length} sources actives
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                setEnabled(Object.fromEntries(SOURCES.map((s) => [s.id, true])))
              }
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Tout activer
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                copyText(buildLinks().map((l) => l.url).join('\n'), 'Liens copiés')
              }
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copier les liens
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                copyText(
                  [
                    `# Balayage ${days} jours — ${armedSubject}`,
                    `Depuis le ${ctx!.date}`,
                    '',
                    ...buildLinks().map((l) => `- [${l.name}](${l.url})`),
                  ].join('\n'),
                  'Markdown copié'
                )
              }
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              Exporter .md
            </Button>
            <Button size="sm" className="gap-2" onClick={openSelection}>
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              Ouvrir la sélection
            </Button>
          </div>

          {/* Sources par catégorie */}
          {CATEGORIES.map((cat) => {
            const list = SOURCES.filter((s) => s.category === cat);
            if (list.length === 0) return null;
            return (
              <section key={cat} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {cat}
                </h2>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((s) => {
                    const on = !!enabled[s.id];
                    const url = s.url(ctx!);
                    const Icon = s.icon;
                    return (
                      <Card
                        key={s.id}
                        className={cn(
                          'transition-opacity motion-reduce:transition-none',
                          !on && 'opacity-50'
                        )}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                            <CardTitle className="text-sm">{s.name}</CardTitle>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className={cn('text-[10px]', precisionStyles[s.precision])}
                                >
                                  {s.precision}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                Précision du filtre de date sur cette plateforme
                              </TooltipContent>
                            </Tooltip>
                            <Switch
                              className="ml-auto"
                              checked={on}
                              onCheckedChange={(v) => setEnabled((p) => ({ ...p, [s.id]: v }))}
                              aria-label={`Activer la source ${s.name}`}
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="font-mono text-xs bg-muted/50 rounded-md p-2 break-words text-muted-foreground">
                            {s.query(ctx!)}
                          </p>
                          <div className="flex gap-2">
                            <Button asChild size="sm" variant="secondary" className="gap-1.5 flex-1">
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                Ouvrir
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => copyText(url, `Lien ${s.name} copié`)}
                              aria-label={`Copier le lien ${s.name}`}
                            >
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                              Copier le lien
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
