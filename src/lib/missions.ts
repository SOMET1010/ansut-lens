/**
 * Rattachement des actualités aux missions stratégiques de l'ANSUT.
 *
 * L'appariement respecte les frontières de mot (mêmes règles que la collecte
 * côté serveur) pour éviter les faux positifs de sous-chaîne : « ia » ne doit
 * pas apparier « média », « uit » ne doit pas apparier « gratuit ».
 */

import type { Actualite } from '@/types';
import { MISSIONS_STRATEGIQUES, type MissionStrategique } from '@/config/missions';

function normaliser(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function echapper(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function contientTerme(contenuNorm: string, terme: string): boolean {
  const t = normaliser(terme).trim();
  if (!t) return false;
  return new RegExp(`(^|[^a-z0-9])${echapper(t)}([^a-z0-9]|$)`).test(contenuNorm);
}

/** Alignement d'un article (0-100) : score de pertinence, sinon importance. */
export function alignement(a: Actualite): number {
  return a.score_pertinence ?? a.importance ?? 0;
}

/** Identifiants des piliers auxquels un texte libre se rattache. */
export function piliersPourTexte(texte: string): string[] {
  const contenu = normaliser(texte ?? '');
  return MISSIONS_STRATEGIQUES
    .filter((m) => m.motsCles.some((kw) => contientTerme(contenu, kw)))
    .map((m) => m.id);
}

/**
 * Mots-clés d'un pilier effectivement détectés dans un texte. Sert à rendre le
 * rattachement EXPLICABLE (« pourquoi cette information est rattachée à ce
 * pilier ? ») plutôt qu'opaque.
 */
export function motsClesDetectes(texte: string, pilierId: string): string[] {
  const contenu = normaliser(texte ?? '');
  const mission = MISSIONS_STRATEGIQUES.find((m) => m.id === pilierId);
  if (!mission) return [];
  return mission.motsCles.filter((kw) => contientTerme(contenu, kw));
}

/** Identifiants des missions auxquelles une actualité se rattache. */
export function missionsDeLActualite(a: Actualite): string[] {
  return piliersPourTexte(`${a.titre ?? ''} ${a.resume ?? ''} ${(a.tags ?? []).join(' ')}`);
}

const IDS_VALIDES = new Set(MISSIONS_STRATEGIQUES.map((m) => m.id));

/**
 * Piliers d'une actualité en privilégiant l'alignement IA persisté
 * (`pilier_id` / `piliers`), avec repli sur l'appariement par mots-clés.
 *
 * On ne fait confiance à un identifiant persisté que s'il appartient au
 * référentiel courant : après un changement de référentiel (bascule vers les
 * piliers propres de l'ANSUT), d'anciens articles portent encore des
 * identifiants obsolètes. Dans ce cas on ignore la valeur persistée et on
 * recalcule par mots-clés, le temps que la ré-collecte/ré-alignement rattrape.
 */
export function piliersDeLActu(a: Actualite): string[] {
  if (a.pilier_id && IDS_VALIDES.has(a.pilier_id)) return [a.pilier_id];
  const persistes = (a.piliers ?? []).filter((id) => IDS_VALIDES.has(id));
  if (persistes.length > 0) return persistes;
  return missionsDeLActualite(a);
}

/** Vrai si l'actualité touche au moins un des piliers donnés. */
export function toucheUnPilier(a: Actualite, piliers: Set<string>): boolean {
  if (piliers.size === 0) return false;
  return piliersDeLActu(a).some((id) => piliers.has(id));
}

/**
 * Vrai si l'actualité est en réalité une publication propre de l'ANSUT (pontée
 * dans `actualites` depuis `publications_institutionnelles`). Ces éléments sont
 * la voix de l'ANSUT : ils ont leur place en section « L'ANSUT récemment », pas
 * dans la veille externe (« ce qui a changé ») ni dans « à arbitrer », où ils
 * feraient remonter de la communication institutionnelle au même rang qu'un
 * signal stratégique.
 */
export function estVoixAnsut(a: Actualite): boolean {
  const type = (a.source_type ?? '').toLowerCase();
  const cat = (a.categorie ?? '').toLowerCase();
  return type === 'institutionnel' || cat === 'institutionnel';
}

export interface GroupePreuves {
  /** Axe de rattachement principal, ou `undefined` pour les sujets hors axes. */
  mission?: MissionStrategique;
  articles: Actualite[];
}

/**
 * Regroupe les actualités par axe pour les présenter comme preuves : chaque
 * article est rattaché à son axe *principal* (le premier apparié, dans l'ordre
 * du référentiel) pour n'apparaître qu'une fois. Les sujets sans axe forment un
 * groupe « Autres sujets » en fin de liste. Les groupes non vides sont classés
 * par volume décroissant ; le groupe hors axes reste toujours dernier.
 */
export function grouperPreuvesParMission(actualites: Actualite[]): GroupePreuves[] {
  const parId = new Map<string, Actualite[]>();
  const hors: Actualite[] = [];

  for (const a of actualites) {
    const ids = missionsDeLActualite(a);
    if (ids.length === 0) {
      hors.push(a);
      continue;
    }
    const principal = ids[0];
    if (!parId.has(principal)) parId.set(principal, []);
    parId.get(principal)!.push(a);
  }

  const groupes: GroupePreuves[] = MISSIONS_STRATEGIQUES
    .filter((m) => parId.has(m.id))
    .map((m) => ({
      mission: m,
      articles: (parId.get(m.id) ?? []).sort((x, y) => alignement(y) - alignement(x)),
    }))
    .sort((a, b) => b.articles.length - a.articles.length);

  if (hors.length > 0) {
    groupes.push({ articles: hors.sort((x, y) => alignement(y) - alignement(x)) });
  }

  return groupes;
}

export type NiveauAttention = 'calme' | 'a-noter' | 'a-surveiller' | 'priorite';

export interface MissionImpactee {
  mission: MissionStrategique;
  articles: Actualite[];
  nombre: number;
  niveau: NiveauAttention;
  /** Article le plus aligné, présenté comme preuve principale. */
  tete?: Actualite;
}

/**
 * Niveau d'attention d'une mission, dérivé du volume et de l'alignement maximal
 * des articles rattachés. Le « sens » (risque / opportunité) viendra en phase 2
 * avec l'analyse par mission ; ici on mesure l'intensité de l'activité.
 */
function niveauAttention(articles: Actualite[]): NiveauAttention {
  if (articles.length === 0) return 'calme';
  const max = Math.max(...articles.map(alignement));
  if (max >= 80) return 'priorite';
  if (max >= 60) return 'a-surveiller';
  return 'a-noter';
}

/**
 * Répartit un ensemble d'actualités récentes par mission stratégique.
 * Une actualité peut nourrir plusieurs missions. Les missions sont classées :
 * d'abord celles qui ont de l'activité, par niveau puis par volume.
 */
export function repartirParMission(actualites: Actualite[]): MissionImpactee[] {
  const parMission = new Map<string, Actualite[]>();
  for (const m of MISSIONS_STRATEGIQUES) parMission.set(m.id, []);

  for (const a of actualites) {
    for (const id of missionsDeLActualite(a)) {
      parMission.get(id)?.push(a);
    }
  }

  const ordreNiveau: Record<NiveauAttention, number> = {
    priorite: 0, 'a-surveiller': 1, 'a-noter': 2, calme: 3,
  };

  return MISSIONS_STRATEGIQUES
    .map((mission) => {
      const articles = (parMission.get(mission.id) ?? []).sort(
        (x, y) => alignement(y) - alignement(x),
      );
      return {
        mission,
        articles,
        nombre: articles.length,
        niveau: niveauAttention(articles),
        tete: articles[0],
      } satisfies MissionImpactee;
    })
    .sort((a, b) => {
      const dn = ordreNiveau[a.niveau] - ordreNiveau[b.niveau];
      return dn !== 0 ? dn : b.nombre - a.nombre;
    });
}
