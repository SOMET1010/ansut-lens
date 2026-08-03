/**
 * Synthèse de l'activité propre de l'ANSUT (question 1 de l'accueil).
 *
 * À partir des publications officielles collectées, on répond à « qu'a fait ou
 * annoncé l'ANSUT récemment ? » en dégageant, sans IA générative et donc sans
 * risque d'invention :
 *   - les programmes / axes mis en avant (piliers stratégiques les plus
 *     communiqués) ;
 *   - les partenaires cités (liste de référence de l'écosystème) ;
 *   - les localités concernées (villes et régions de Côte d'Ivoire) ;
 *   - les échéances publiques (années, trimestres, horizons annoncés).
 *
 * Chaque élément est extrait par appariement à frontière de mot du texte réel
 * des publications : il est donc adossé à une source datée, jamais inventé.
 */

import { deriverAdnPublications } from '@/lib/prioritesAnsut';
import { MISSIONS_STRATEGIQUES } from '@/config/missions';
import type { PublicationAnsut } from '@/hooks/useAnsutPublications';

function normaliser(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function echapper(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function contient(texteNorm: string, terme: string): boolean {
  const t = normaliser(terme).trim();
  if (!t) return false;
  return new RegExp(`(^|[^a-z0-9])${echapper(t)}([^a-z0-9]|$)`).test(texteNorm);
}

/**
 * Partenaires de référence de l'écosystème numérique ivoirien. Chaque entrée
 * associe une forme d'affichage à ses variantes d'écriture, pour un appariement
 * robuste (« AST SpaceMobile », « SpaceMobile », etc.).
 */
const PARTENAIRES: { nom: string; variantes: string[] }[] = [
  { nom: 'Orange', variantes: ['orange ci', 'orange côte', 'orange cote'] },
  { nom: 'MTN', variantes: ['mtn'] },
  { nom: 'Moov Africa', variantes: ['moov'] },
  { nom: 'Starlink', variantes: ['starlink'] },
  { nom: 'AST SpaceMobile', variantes: ['ast spacemobile', 'spacemobile'] },
  { nom: 'GSMA', variantes: ['gsma'] },
  { nom: 'UIT', variantes: ['uit', 'itu', 'union internationale des télécommunications'] },
  { nom: 'Banque mondiale', variantes: ['banque mondiale', 'world bank'] },
  { nom: 'BAD', variantes: ['banque africaine de développement', 'african development bank'] },
  { nom: 'PNUD', variantes: ['pnud', 'undp'] },
  { nom: 'UNICEF', variantes: ['unicef'] },
  { nom: 'Union européenne', variantes: ['union européenne', 'union europeenne'] },
  { nom: 'Smart Africa', variantes: ['smart africa'] },
  { nom: 'Huawei', variantes: ['huawei'] },
  { nom: 'Ericsson', variantes: ['ericsson'] },
  { nom: 'Nokia', variantes: ['nokia'] },
  { nom: 'ARTCI', variantes: ['artci'] },
  { nom: 'ONECI', variantes: ['oneci'] },
  { nom: 'ESATIC', variantes: ['esatic'] },
  { nom: 'VITIB', variantes: ['vitib'] },
  { nom: 'La Poste', variantes: ['la poste', 'poste de côte', 'poste de cote'] },
];

/** Villes et régions de Côte d'Ivoire, pour repérer les territoires cités. */
const LOCALITES = [
  'Abidjan', 'Yamoussoukro', 'Bouaké', 'San-Pédro', 'San Pedro', 'Korhogo', 'Man',
  'Daloa', 'Gagnoa', 'Divo', 'Abengourou', 'Séguéla', 'Odienné', 'Bondoukou',
  'Ferkessédougou', 'Aboisso', 'Soubré', 'Grand-Bassam', 'Bingerville', 'Adzopé',
  'Toumodi', 'Dabou', 'Agboville', 'Bouna', 'Touba', 'Katiola', 'Sassandra',
  'Danané', 'Guiglo', 'Bangolo', 'Tiassalé', 'Boundiali', 'Tengréla',
];

/** Un mois nommé suivi ou non d'une année, ou une année seule, un trimestre… */
const MOIS =
  'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';

export interface SyntheseAnsut {
  /** Piliers mis en avant, du plus au moins communiqué (max 3). */
  programmes: { pilierId: string; code: string; nom: string; publications: number }[];
  /** Partenaires cités (formes d'affichage, dédoublonnées). */
  partenaires: string[];
  /** Localités et régions citées. */
  localites: string[];
  /** Échéances publiques repérées (années, trimestres, horizons). */
  echeances: string[];
  /** Nombre de publications analysées. */
  total: number;
}

/**
 * Extrait les échéances d'un texte : années 2024-2030, trimestres (T1…, « premier
 * trimestre »), et horizons (« d'ici 2027 », « à l'horizon 2030 », mois + année).
 * On renvoie des libellés courts et dédoublonnés.
 */
function extraireEcheances(texteBrut: string): string[] {
  const found = new Set<string>();
  const t = texteBrut;

  // Horizons explicites : « d'ici 2027 », « à l'horizon 2030 »
  for (const m of t.matchAll(/\b(?:d['’]ici|horizon|à l['’]horizon)\s+(20(?:2[4-9]|30))\b/gi)) {
    found.add(`d’ici ${m[1]}`);
  }
  // Trimestres : « T1 2026 », « premier trimestre 2026 »
  for (const m of t.matchAll(/\bT([1-4])\s?(20(?:2[4-9]|30))\b/gi)) {
    found.add(`T${m[1]} ${m[2]}`);
  }
  for (const m of t.matchAll(
    /\b(premier|deuxième|deuxieme|troisième|troisieme|quatrième|quatrieme)\s+trimestre(?:\s+(20(?:2[4-9]|30)))?/gi,
  )) {
    found.add(`${m[1]} trimestre${m[2] ? ' ' + m[2] : ''}`);
  }
  // Mois + année : « mars 2026 »
  for (const m of t.matchAll(new RegExp(`\\b(${MOIS})\\s+(20(?:2[4-9]|30))\\b`, 'gi'))) {
    found.add(`${m[1]} ${m[2]}`);
  }
  // Années seules, seulement futures ou en cours (évite le bruit rétrospectif).
  const anneeCourante = 2026; // NB: pas de Date.now() ici, année de référence produit.
  for (const m of t.matchAll(/\b(20(?:2[4-9]|30))\b/g)) {
    const an = parseInt(m[1], 10);
    if (an >= anneeCourante) found.add(m[1]);
  }

  return [...found].slice(0, 4);
}

/**
 * Partenaires / institutions de référence cités dans un texte libre (article de
 * veille, publication…). Réutilise la liste de référence de l'écosystème et
 * l'appariement à frontière de mot : aucun nom n'est inventé, chaque partenaire
 * détecté est adossé au texte réel.
 */
export function partenairesDansTexte(texte: string): string[] {
  const n = normaliser(texte ?? '');
  return PARTENAIRES.filter((p) => [p.nom, ...p.variantes].some((v) => contient(n, v))).map(
    (p) => p.nom,
  );
}

export function synthetiserPublications(publications: PublicationAnsut[]): SyntheseAnsut {
  const pubs = publications ?? [];
  const texteBrut = pubs.map((p) => p.contenu ?? '').join('  \n  ');
  const texteNorm = normaliser(texteBrut);

  // Programmes = piliers les plus communiqués (réutilise l'ADN publications).
  const adn = deriverAdnPublications(pubs);
  const programmes = adn.priorites
    .map((p) => {
      const mission = MISSIONS_STRATEGIQUES.find((m) => m.id === p.pilierId);
      return mission
        ? { pilierId: p.pilierId, code: mission.code, nom: mission.nom, publications: p.publications }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 3);

  const partenaires = PARTENAIRES.filter((p) =>
    [p.nom, ...p.variantes].some((v) => contient(texteNorm, v)),
  ).map((p) => p.nom);

  const localites = LOCALITES.filter((v) => contient(texteNorm, v))
    // Dédoublonne les variantes d'écriture (San-Pédro / San Pedro).
    .reduce<string[]>((acc, v) => {
      const canon = v.replace(/\s/g, '-');
      if (!acc.some((x) => x.replace(/\s/g, '-') === canon)) acc.push(v);
      return acc;
    }, [])
    .slice(0, 6);

  const echeances = extraireEcheances(texteBrut);

  return { programmes, partenaires, localites, echeances, total: pubs.length };
}
