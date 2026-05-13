// Edge function: collecte-titrologie
// Collects daily Ivorian press front pages, runs OCR + visual analysis (Gemini 2.5 Pro multimodal),
// extracts titles, themes, tone, ANSUT risk. Stores results in titrologie_unes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

// Pluggable scrapers — Phase 1 cible la titrologie papier (Abidjan.net + Presse CI).
// Architecture extensible : ajouter ultérieurement GDELT / NewsData / Mediastack
// en créant de nouveaux discoverers et en les ajoutant à DISCOVERERS.
interface ScrapeSource {
  key: string;
  name: string;
  url: string;
}

const TITROLOGIE_SOURCES: ScrapeSource[] = [
  { key: 'abidjan_net', name: 'Abidjan.net Titrologie', url: 'https://news.abidjan.net/titrologie' },
  { key: 'presse_ci', name: 'Presse Côte d\'Ivoire Titrologie', url: 'https://www.pressecotedivoire.fr/titrologie' },
];

const ANSUT_KEYWORDS = [
  'ansut', 'service universel', 'télécommunications', 'fibre', 'connectivité',
  'numérique', '5g', '4g', 'internet', 'cybersécurité', 'data center',
  'haut débit', 'inclusion numérique', 'transformation digitale',
];

interface RawUne {
  journal: string;
  titre_une: string;
  image_url?: string;
  source_url?: string;
}

// Resolve relative URLs against a base
function absoluteUrl(src: string, base: string): string {
  try { return new URL(src, base).toString(); } catch { return src; }
}

// Heuristic to guess journal name from filename / alt text
function guessJournal(input: string): string {
  const cleaned = input
    .replace(/\.(jpe?g|png|webp|gif|pdf)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b(une|titrologie|journal|du|le|la|les|of|the)\b/gi, ' ')
    .replace(/\d{2,4}[-/]\d{1,2}[-/]\d{1,4}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Journal';
}

// Stats de collecte par source (logs techniques exposés à l'admin)
interface SourceStat {
  source: string;
  url: string;
  nombre_images_detectees: number;
  nombre_images_traitees: number;
  nombre_erreurs_ocr: number;
  dernier_scan: string;
  statut: 'success' | 'partial' | 'error';
  error?: string | null;
}

interface ScrapeOutcome { unes: RawUne[]; stat: SourceStat; }

// 1. Discover front pages via Firecrawl scraping (Phase 1: Abidjan.net + Presse CI)
async function scrapeSourceForUnes(src: ScrapeSource): Promise<ScrapeOutcome> {
  const stat: SourceStat = {
    source: src.name, url: src.url,
    nombre_images_detectees: 0, nombre_images_traitees: 0, nombre_erreurs_ocr: 0,
    dernier_scan: new Date().toISOString(), statut: 'success', error: null,
  };
  if (!FIRECRAWL_API_KEY) {
    stat.statut = 'error'; stat.error = 'FIRECRAWL_API_KEY missing';
    return { unes: [], stat };
  }

  const resp = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: src.url, formats: ['html', 'links', 'markdown'], onlyMainContent: false, waitFor: 1500 }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    stat.statut = 'error'; stat.error = `Firecrawl ${resp.status}: ${t.slice(0,160)}`;
    console.error(`[Titrologie] ${stat.error}`);
    return { unes: [], stat };
  }
  const payload = await resp.json();
  const data = payload?.data ?? payload;
  const html: string = data?.html || data?.rawHtml || '';
  if (!html) { stat.statut = 'error'; stat.error = 'HTML vide'; return { unes: [], stat }; }

  const unes: RawUne[] = [];
  const seen = new Set<string>();
  const imgRe = /<img\b[^>]*?>/gi;
  const srcRe = /\bsrc\s*=\s*"([^"]+)"|\bsrc\s*=\s*'([^']+)'/i;
  const altRe = /\balt\s*=\s*"([^"]*)"|\balt\s*=\s*'([^']*)'/i;
  const titleRe = /\btitle\s*=\s*"([^"]*)"|\btitle\s*=\s*'([^']*)'/i;

  const matches = html.match(imgRe) || [];
  stat.nombre_images_detectees = matches.length;
  for (const tag of matches) {
    const sm = tag.match(srcRe); const am = tag.match(altRe); const tm = tag.match(titleRe);
    const rawSrc = sm ? (sm[1] || sm[2]) : '';
    if (!rawSrc) continue;
    const url = absoluteUrl(rawSrc, src.url);
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(url)) continue;
    if (/(logo|sprite|icon|avatar|banner|pub|advert|placeholder|share|social|facebook|twitter|whatsapp)/i.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    const altText = (am ? (am[1] || am[2]) : '') || (tm ? (tm[1] || tm[2]) : '');
    const fname = url.split('/').pop() || '';
    const journal = guessJournal(altText || fname);
    unes.push({ journal, titre_une: altText || `Une ${journal}`, image_url: url, source_url: src.url });
    if (unes.length >= 20) break;
  }
  console.log(`[Titrologie] ${src.key}: ${unes.length}/${stat.nombre_images_detectees} unes retenues`);
  return { unes, stat };
}

async function discoverUnes(): Promise<{ unes: RawUne[]; stats: SourceStat[] }> {
  const all: RawUne[] = [];
  const stats: SourceStat[] = [];
  for (const src of TITROLOGIE_SOURCES) {
    try {
      const out = await scrapeSourceForUnes(src);
      all.push(...out.unes);
      stats.push(out.stat);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[Titrologie] scrape ${src.key} failed:`, msg);
      stats.push({
        source: src.name, url: src.url,
        nombre_images_detectees: 0, nombre_images_traitees: 0, nombre_erreurs_ocr: 0,
        dernier_scan: new Date().toISOString(), statut: 'error', error: msg,
      });
    }
  }
  const dedup = new Map<string, RawUne>();
  for (const u of all) {
    const key = u.image_url || `${u.journal}::${u.titre_une}`;
    if (!dedup.has(key)) dedup.set(key, u);
  }
  return { unes: Array.from(dedup.values()).slice(0, 10), stats };
}


// 2. OCR + visual analysis on a front page image (Gemini 2.5 Pro multimodal)
async function ocrAndAnalyze(une: RawUne): Promise<any> {
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');

  const userParts: any[] = [
    {
      type: 'text',
      text: `Analyse cette une de presse ivoirienne (journal: ${une.journal}). Titre indicatif : "${une.titre_une}".
Tâches :
1. OCR : extrait tous les titres visibles (gros titres, sous-titres). Renvoie le texte brut concaténé dans raw_ocr.
2. Titre principal de la une.
3. titres_secondaires : tableau des autres titres visibles (chapeaux, sous-titres, encadrés), un titre par item, déjà nettoyés.
4. ocr_confidence (0-100) : confiance globale de la lecture OCR (qualité d'image, netteté, lisibilité). 0 = illisible, 100 = parfait.
5. ocr_warnings : tableau d'anomalies détectées (image floue, titre tronqué, texte illisible, charabia OCR…). Vide si propre.
6. Sujet dominant.
7. Ton.
8. Risque ANSUT (VERT/ORANGE/ROUGE) selon proximité avec : ${ANSUT_KEYWORDS.join(', ')}.
9. 2-5 thèmes clés (mots courts).
10. Lien ANSUT direct/indirect en 1 phrase, sinon null.
11. **ANALYSE PAR ANGLE** — pour chaque angle (politique, social, economique, numerique_telecom, reputationnel) :
   - intensite : 0 (absent) / 1 (faible) / 2 (moyen) / 3 (fort)
   - lecture : 1 phrase factuelle (max 25 mots) si intensite ≥ 1, sinon null
   - liens : tableau des références institutionnelles détectées (vide si aucune). Pour chaque entité concernée parmi :
       * ANSUT (Agence Nationale du Service Universel des Télécommunications)
       * MTNIT (Ministère de la Transition Numérique, de l'Innovation et des Télécommunications)
       * SERVICE_UNIVERSEL (politique de service universel : zones blanches, fibre rurale, accessibilité numérique, e-services)
     fournir : { entite, phrase (1 phrase explicative ≤ 30 mots), preuve (citation factuelle extraite de la une / OCR ou null), sources (URLs de la une si disponibles), confiance (entier 0-100 reflétant la solidité du rattachement à l'entité — 0 spéculatif, 100 explicitement nommé/cité) }.
   - confiance : entier 0-100 reflétant la fiabilité globale de l'analyse de cet angle (lecture OCR + interprétation).
   Ne jamais inventer un lien : si l'entité n'est pas explicitement ou implicitement concernée par l'angle, ne pas l'inclure.

Réponds via l'outil structurer_une.`,
    },
  ];

  if (une.image_url && /^https?:\/\//.test(une.image_url)) {
    userParts.push({ type: 'image_url', image_url: { url: une.image_url } });
  }

  const lienSchema = {
    type: 'object',
    properties: {
      entite: { type: 'string', enum: ['ANSUT', 'MTNIT', 'SERVICE_UNIVERSEL'] },
      phrase: { type: 'string' },
      preuve: { type: 'string', description: 'Citation factuelle, vide si non disponible' },
      sources: { type: 'array', items: { type: 'string' } },
      confiance: { type: 'integer', description: '0-100 fiabilité du lien' },
    },
    required: ['entite', 'phrase'],
  };

  const angleSchema = {
    type: 'object',
    properties: {
      intensite: { type: 'integer', description: '0=absent,1=faible,2=moyen,3=fort' },
      lecture: { type: 'string', description: 'Vide si intensite=0' },
      liens: { type: 'array', items: lienSchema },
      confiance: { type: 'integer', description: '0-100 fiabilité de l analyse' },
    },
    required: ['intensite'],
  };

  const buildBody = (model: string) => ({
    model,
    messages: [
      { role: 'system', content: 'Tu es analyste presse ANSUT/MTND. Précis, factuel, aucune invention.' },
      { role: 'user', content: userParts },
    ],
    temperature: 0.3,
    tools: [{
      type: 'function',
      function: {
        name: 'structurer_une',
        description: 'Structure l\'analyse OCR + visuelle + par angle de la une',
        parameters: {
          type: 'object',
          properties: {
            raw_ocr: { type: 'string' },
            titre_principal: { type: 'string' },
            titres_secondaires: { type: 'array', items: { type: 'string' }, description: 'Titres secondaires lus sur la une (chacun séparé)' },
            ocr_confidence: { type: 'integer', description: '0-100 fiabilité OCR' },
            ocr_warnings: { type: 'array', items: { type: 'string' }, description: 'Anomalies/erreurs OCR détectées (flou, troncature, charabia…)' },
            sujet: { type: 'string', enum: ['politique','economie','social','sport','telecom_numerique','securite','international','autre'] },
            ton: { type: 'string', enum: ['positif','negatif','neutre','alarmiste','critique'] },
            risque_ansut: { type: 'string', enum: ['VERT','ORANGE','ROUGE'] },
            themes: { type: 'array', items: { type: 'string' } },
            lien_ansut: { type: 'string', description: 'Vide si pas de lien' },
            angles: {
              type: 'object',
              properties: {
                politique: angleSchema,
                social: angleSchema,
                economique: angleSchema,
                numerique_telecom: angleSchema,
                reputationnel: angleSchema,
              },
              required: ['politique','social','economique','numerique_telecom','reputationnel'],
            },
          },
          required: ['titre_principal','sujet','ton','risque_ansut','themes','angles','ocr_confidence'],
        },
      },
    }],
    tool_choice: { type: 'function', function: { name: 'structurer_une' } },
  });

  // Default to Flash for speed; fallback to Flash-Lite then Pro on timeout/5xx.
  const MODELS = ['google/gemini-2.5-flash-lite', 'google/gemini-2.5-flash'];
  const TIMEOUT_MS = 25000;
  let lastErr: unknown = null;

  for (const model of MODELS) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody(model)),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!resp.ok) {
        const txt = await resp.text();
        const retriable = resp.status === 408 || resp.status === 429 || resp.status >= 500;
        console.warn(`[Titrologie] ${model} -> ${resp.status} ${retriable ? '(fallback)' : ''}: ${txt.slice(0,200)}`);
        if (!retriable) throw new Error(`Gateway ${resp.status}: ${txt.slice(0, 800)}`);
        lastErr = new Error(`Gateway ${resp.status}`);
        continue;
      }
      const data = await resp.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) throw new Error('No tool call returned');
      return JSON.parse(toolCall.function.arguments);
    } catch (e) {
      clearTimeout(t);
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[Titrologie] ${model} échec (${msg}) — fallback suivant`);
      lastErr = e;
      continue;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('All models failed');
}

async function runCollecte(supabase: any, runId: string | undefined, today: string, startedAt: number) {
  try {
    console.log('[Titrologie] Discovering unes...');
    const { unes: rawUnes, stats: sourceStats } = await discoverUnes();
    console.log(`[Titrologie] Found ${rawUnes.length} raw unes`);

    // Wipe today's unes upfront so progressive inserts replace them cleanly
    await supabase.from('titrologie_unes').delete().eq('date_parution', today);

    let analyzed = 0;
    const statByUrl = new Map<string, SourceStat>(sourceStats.map(s => [s.url, s]));

    for (let i = 0; i < rawUnes.length; i++) {
      const une = rawUnes[i];
      const stat = une.source_url ? statByUrl.get(une.source_url) : undefined;
      try {
        const analysis = await ocrAndAnalyze(une);
        if (stat) stat.nombre_images_traitees++;
        const row = {
          date_parution: today,
          journal: une.journal,
          image_url: une.image_url || null,
          source_url: une.source_url || null,
          titre_une: analysis.titre_principal || une.titre_une,
          sujet: analysis.sujet,
          ton: analysis.ton,
          risque_ansut: analysis.risque_ansut || 'VERT',
          lien_ansut: analysis.lien_ansut || null,
          themes: analysis.themes || [],
          raw_ocr: analysis.raw_ocr || null,
          angles: analysis.angles || {},
          analyse_ia: analysis,
        };
        const { error: insErr } = await supabase.from('titrologie_unes').insert(row);
        if (insErr) console.error('[Titrologie] insert err:', insErr.message);
        else analyzed++;
      } catch (e) {
        if (stat) { stat.nombre_erreurs_ocr++; if (stat.statut === 'success') stat.statut = 'partial'; }
        console.error(`[Titrologie] Analyze failed for ${une.journal}:`, e instanceof Error ? e.message : e);
      }

      // Progressive run state update so admin can monitor progress live
      if (runId && (i + 1) % 2 === 0) {
        await supabase.from('titrologie_runs').update({
          unes_collected: rawUnes.length,
          unes_analyzed: analyzed,
          metadata: { sources: sourceStats, progress: `${i + 1}/${rawUnes.length}` },
        }).eq('id', runId);
      }
    }

    await supabase.from('titrologie_runs').update({
      status: analyzed > 0 ? 'success' : 'error',
      unes_collected: rawUnes.length,
      unes_analyzed: analyzed,
      duration_ms: Date.now() - startedAt,
      finished_at: new Date().toISOString(),
      error: analyzed === 0 ? 'Aucune une analysée' : null,
      metadata: { sources: sourceStats },
    }).eq('id', runId);
    console.log(`[Titrologie] DONE — ${analyzed}/${rawUnes.length} analyzed`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Titrologie] FATAL:', msg);
    await supabase.from('titrologie_runs').update({
      status: 'error', error: msg, duration_ms: Date.now() - startedAt,
      finished_at: new Date().toISOString(),
    }).eq('id', runId);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const startedAt = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  const { data: run } = await supabase.from('titrologie_runs')
    .insert({ run_date: today, status: 'running' }).select().single();
  const runId = run?.id;

  // Run in background to survive client disconnect; return immediately
  // @ts-ignore EdgeRuntime is available in Supabase Edge Runtime
  EdgeRuntime.waitUntil(runCollecte(supabase, runId, today, startedAt));

  return new Response(JSON.stringify({
    ok: true, runId, date: today, status: 'started',
    message: 'Collecte démarrée en arrière-plan. Suivre la progression via /admin/titrologie.',
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

