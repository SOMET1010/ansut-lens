// =============================================================================
// GÉNÉRÉ AUTOMATIQUEMENT — NE PAS ÉDITER À LA MAIN.
// Source : scripts/gen-etage2-shared.mjs (à partir de src/config/missions.ts et
// src/lib/qualificationContenu.ts). Régénérer : node scripts/gen-etage2-shared.mjs
// Parité garantie par src/lib/__tests__/qualificationParity.test.ts.
// =============================================================================

/**
 * Qualifieur ÉDITORIAL portable (étage 2) — même logique que le frontend
 * (`src/lib/qualificationContenu.ts`), exécutable côté Deno pour persister la
 * qualification à l'ingestion et lors du backfill. On persiste des FAITS ; les
 * éligibilités sont dérivées ailleurs (Option B).
 */

export const RULES_VERSION = 1;

export type CategorieCommunication =
  | 'institutionnelle' | 'programme' | 'evenementielle' | 'communautaire'
  | 'promotionnelle' | 'protocolaire' | 'sportive' | 'autre';

const CATEGORIES_INSTITUTIONNELLES = new Set<CategorieCommunication>([
  'institutionnelle', 'programme', 'evenementielle',
]);

const MARQUEURS: { categorie: CategorieCommunication; mots: string[] }[] = [
  {
    "categorie": "sportive",
    "mots": [
      "football",
      "foot",
      "match",
      "champion",
      "championne",
      "championnat",
      "fanzone",
      "fan zone",
      "coupe",
      "trophée",
      "sportif",
      "sportive",
      "éléphants",
      "elephants",
      "can 2",
      "sélection",
      "selection",
      "stade",
      "supporters",
      "victoire",
      "équipe nationale"
    ]
  },
  {
    "categorie": "promotionnelle",
    "mots": [
      "téléchargez",
      "telechargez",
      "télécharger",
      "application",
      "appli",
      "jeu concours",
      "concours",
      "promo",
      "disponible sur"
    ]
  },
  {
    "categorie": "protocolaire",
    "mots": [
      "félicitations",
      "felicitations",
      "hommage",
      "condoléances",
      "condoleances",
      "anniversaire",
      "meilleurs vœux",
      "meilleurs voeux",
      "bonne fête",
      "bonne fete",
      "joyeux"
    ]
  },
  {
    "categorie": "evenementielle",
    "mots": [
      "gitex",
      "salon",
      "forum",
      "séminaire",
      "seminaire",
      "conférence",
      "conference",
      "cérémonie",
      "ceremonie",
      "sommet",
      "atelier",
      "panel",
      "table ronde",
      "édition",
      "edition",
      "webinaire",
      "participe",
      "prend part",
      "journée"
    ]
  },
  {
    "categorie": "programme",
    "mots": [
      "projet",
      "programme",
      "déploiement",
      "deploiement",
      "chantier",
      "infrastructure",
      "fibre",
      "ftth",
      "localités",
      "localites",
      "raccordement",
      "couverture"
    ]
  },
  {
    "categorie": "institutionnelle",
    "mots": [
      "communiqué",
      "communique",
      "partenariat",
      "convention",
      "signature",
      "signé",
      "signe",
      "accord",
      "protocole",
      "inauguration",
      "inaugure",
      "lancement",
      "officiel",
      "officielle",
      "engagement"
    ]
  },
  {
    "categorie": "communautaire",
    "mots": [
      "communauté",
      "communaute",
      "grand public",
      "citoyens",
      "citoyennes",
      "ensemble",
      "mobilisation",
      "sensibilisation"
    ]
  }
];

const PILIERS: { id: string; motsCles: string[] }[] = [
  {
    "id": "connectivite-universelle",
    "motsCles": [
      "connectivité",
      "connectivité rurale",
      "connectivité universelle",
      "couverture réseau",
      "couverture mobile",
      "zone blanche",
      "zones blanches",
      "zone non couverte",
      "rnhd",
      "réseau national haut débit",
      "ria",
      "backbone",
      "dorsale",
      "haut débit",
      "très haut débit",
      "fibre optique",
      "fibre",
      "last mile",
      "dernier kilomètre",
      "allumage",
      "infrastructures numériques",
      "infrastructures critiques",
      "centre de données",
      "datacenter",
      "data center",
      "point d’échange internet",
      "couverture 4g",
      "couverture 5g",
      "4g",
      "5g",
      "connectivité satellitaire",
      "satellite",
      "starlink",
      "ast spacemobile",
      "direct-to-cell",
      "orbite basse",
      "télécommunications",
      "télécoms",
      "opérateurs",
      "spectre",
      "localités connectées",
      "bus",
      "connectmyzone",
      "programme universel",
      "connectivity",
      "rural connectivity",
      "network coverage",
      "mobile coverage",
      "broadband",
      "backbone",
      "fiber",
      "fibre",
      "last mile",
      "data center",
      "data centre",
      "satellite internet",
      "unconnected",
      "telecom operators",
      "spectrum",
      "digital infrastructure"
    ]
  },
  {
    "id": "services-inclusion",
    "motsCles": [
      "e-service",
      "e-services",
      "services numériques",
      "services publics numériques",
      "e-gouvernement",
      "e-gouvernance",
      "administration numérique",
      "dématérialisation",
      "démarches en ligne",
      "guichet unique",
      "identité numérique",
      "identifiant numérique",
      "interopérabilité",
      "e-conseil",
      "conseil des ministres",
      "e-santé",
      "e-éducation",
      "e-administration",
      "e-agriculture",
      "point d’accès universel",
      "points d’accès universels",
      "inclusion numérique",
      "inclusion sociale",
      "inclusion financière",
      "fracture numérique",
      "entrepreneuriat",
      "entrepreneuriat digital",
      "start-up",
      "startup",
      "contenus locaux",
      "innovation",
      "n’zassa",
      "nzassa",
      "abris bus",
      "femmes",
      "jeunes filles",
      "e-services",
      "digital services",
      "digital public services",
      "e-government",
      "digital government",
      "digitalization",
      "one-stop shop",
      "digital identity",
      "digital inclusion",
      "financial inclusion",
      "digital divide",
      "startups",
      "entrepreneurship",
      "e-health",
      "e-education"
    ]
  },
  {
    "id": "usages-competences",
    "motsCles": [
      "compétences numériques",
      "culture numérique",
      "usages numériques",
      "usages digitaux",
      "formation numérique",
      "formation en ligne",
      "digital literacy",
      "alphabétisation numérique",
      "littératie numérique",
      "illectronisme",
      "sensibilisation numérique",
      "reconversion",
      "montée en compétences",
      "talents numériques",
      "métiers du numérique",
      "esatic",
      "accès aux terminaux",
      "terminaux",
      "smartphone",
      "smartphones",
      "tablette",
      "tablettes",
      "équipements numériques",
      "devices",
      "cicn",
      "centre d'innovation",
      "inclusion des jeunes",
      "intelligence artificielle",
      "ia",
      "blockchain",
      "big data",
      "données massives",
      "technologies émergentes",
      "technologies innovantes",
      "technologie émergente",
      "technologie innovante",
      "innovation technologique",
      "digital skills",
      "digital literacy",
      "digital culture",
      "e-learning",
      "upskilling",
      "reskilling",
      "training",
      "devices",
      "smartphones",
      "tablets",
      "digital talents",
      "artificial intelligence",
      "emerging technologies"
    ]
  },
  {
    "id": "excellence-operationnelle",
    "motsCles": [
      "gouvernance",
      "gouvernance numérique",
      "pilotage stratégique",
      "suivi-évaluation",
      "audit",
      "maîtrise des risques",
      "tableau de bord",
      "cockpit",
      "salle de supervision",
      "noc",
      "reddition de comptes",
      "redevabilité",
      "performance",
      "financement",
      "tdntic",
      "redevance",
      "fonds verts",
      "partenariat public-privé",
      "ppp",
      "bailleurs",
      "partenaires techniques et financiers",
      "bad",
      "banque mondiale",
      "afd",
      "kfw",
      "uit",
      "mobilisation des ressources",
      "rse",
      "communication institutionnelle",
      "notoriété",
      "rayonnement",
      "rayonnement régional",
      "e-ca",
      "conseil d’administration",
      "governance",
      "monitoring",
      "evaluation",
      "audit",
      "risk management",
      "dashboard",
      "funding",
      "financing",
      "public-private partnership",
      "green funds",
      "world bank",
      "african development bank",
      "resource mobilization",
      "institutional communication"
    ]
  }
];

function normaliser(s: string): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function echapper(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function contient(texteNorm: string, terme: string): boolean {
  const t = normaliser(terme).trim();
  if (!t) return false;
  return new RegExp(`(^|[^a-z0-9])${echapper(t)}([^a-z0-9]|$)`).test(texteNorm);
}

export function categoriser(texte: string | null): CategorieCommunication {
  const t = normaliser(texte ?? '');
  for (const { categorie, mots } of MARQUEURS) {
    if (mots.some((m) => contient(t, m))) return categorie;
  }
  return 'autre';
}

/** Piliers appariés + mots-clés déclencheurs (pour la traçabilité). */
export function piliersDeTexte(texte: string | null): { ids: string[]; marqueurs: Record<string, string[]> } {
  const t = normaliser(texte ?? '');
  const ids: string[] = [];
  const marqueurs: Record<string, string[]> = {};
  for (const p of PILIERS) {
    const hits = p.motsCles.filter((kw) => contient(t, kw));
    if (hits.length > 0) { ids.push(p.id); marqueurs[p.id] = hits; }
  }
  return { ids, marqueurs };
}

/** Identité de contenu : URL canonique normalisée, sinon hash du texte. */
export function contentKey(url: string | null, texte: string | null): string {
  if (url && /^https?:\/\//i.test(url)) {
    try {
      const u = new URL(url);
      return (u.host + u.pathname).toLowerCase().replace(/\/+$/, '');
    } catch { /* repli hash */ }
  }
  return 'hash:' + hashTexte(normaliser(texte ?? ''));
}

function hashTexte(s: string): string {
  // djb2 — suffisant comme clé de dédoublonnage à notre volume.
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

export interface FaitsQualification {
  editorial_date: string | null;
  date_verified: boolean;
  date_source: string;
  category: CategorieCommunication;
  primary_theme: string | null;
  secondary_themes: string[];
  is_institutional: boolean;
  is_ansut_voice: boolean;
  evidence: Record<string, unknown>;
  limitations: string[];
}

/**
 * Produit les FAITS éditoriaux d'un contenu. La datation est fournie par
 * l'appelant (colonnes de provenance existantes) — on ne fabrique jamais de date.
 */
export function qualifierContenu(input: {
  texte: string | null;
  publishedAt: string | null;
  dateVerified: boolean;
  dateSource: string;
  isAnsutVoice: boolean;
  nowMs: number;
}): FaitsQualification {
  const ms = input.publishedAt ? new Date(input.publishedAt).getTime() : NaN;
  const dateOk = input.dateVerified && !Number.isNaN(ms) && ms <= input.nowMs;
  const editorial_date = dateOk ? input.publishedAt : null;

  const category = categoriser(input.texte);
  const { ids, marqueurs } = piliersDeTexte(input.texte);
  const is_institutional = ids.length > 0 && CATEGORIES_INSTITUTIONNELLES.has(category);

  const limitations: string[] = [];
  if (!dateOk) limitations.push('date_non_verifiee');
  if (ids.length === 0) limitations.push('aucun_theme_strategique');

  return {
    editorial_date,
    date_verified: dateOk,
    date_source: input.dateSource || 'unknown',
    category,
    primary_theme: ids[0] ?? null,
    secondary_themes: ids,
    is_institutional,
    is_ansut_voice: input.isAnsutVoice,
    evidence: { category, theme_markers: marqueurs, date_source: input.dateSource || 'unknown' },
    limitations,
  };
}
