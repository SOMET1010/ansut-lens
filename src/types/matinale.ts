// Strict shape returned by the `generer-matinale` edge function.
// Mirrors the JSON-schema declared in supabase/functions/generer-matinale/index.ts
// (tool `generate_matinale_codir`).

export type Niveau = 'ROUGE' | 'ORANGE' | 'VERT' | 'BLEU';
export type ImpactNiveau = 'ÉLEVÉ' | 'MOYEN' | 'FAIBLE' | 'AUCUN';
export type Visibilite = 'Faible' | 'Moyen' | 'Fort';
export type Rubrique =
  | 'telecom_numerique'
  | 'economie_finance'
  | 'gouvernance_regulation'
  | 'international';
export type Pilier =
  | 'connectivite'
  | 'usages_services'
  | 'regulation_souverainete'
  | 'concurrence_marche';

export interface PrioriteExecutive {
  titre: string;
  impacts: string[];
  recommandation: string[];
  niveau: Niveau;
}

export interface SyntheseItem {
  sujet: string;
  impact_ansut: string;
  niveau: Niveau;
}

export interface VeillePilierItem {
  titre: string;
  lecture_ansut: string;
  niveau: Niveau;
  url?: string;
  source?: string;
}

export type VeilleParPilier = Record<Pilier, VeillePilierItem[]>;

export interface LectureStrategiqueItem {
  sujet: string;
  opportunites: string[];
  risques: string[];
  scores: {
    acces: number;
    usage: number;
    gouvernance: number;
    souverainete: number;
  };
}

export interface ImpactProjetItem {
  domaine: string;
  impact: ImpactNiveau;
  commentaire: string;
}

export interface ActionImmediate {
  action: string;
  responsable: string;
  delai: string;
}

export interface ReputationAnsut {
  positif: string[];
  negatif: string[];
  confusion_role: string | null;
  niveau_risque: Niveau;
}

export interface RevueItem {
  titre: string;
  source: string;
  date: string;
  url: string;
  rubrique: Rubrique;
}

export interface ActiviteAnsut {
  publications_count: number;
  visibilite: Visibilite;
}

export interface MatinaleData {
  priorite_executive?: PrioriteExecutive;
  synthese_60s?: SyntheseItem[];
  veille_par_pilier?: Partial<VeilleParPilier>;
  lecture_strategique?: LectureStrategiqueItem[];
  impact_projets_ansut?: ImpactProjetItem[];
  actions_immediates?: ActionImmediate[];
  reputation_ansut?: ReputationAnsut;
  signaux_faibles?: string[];
  revue_de_presse?: RevueItem[];
  activite_ansut?: ActiviteAnsut;
}

export type TitrologieSujet = 'politique' | 'social' | 'economique' | 'numerique_telecom' | 'reputationnel' | 'international' | 'autre';
export type TitrologieTon = 'positif' | 'neutre' | 'negatif' | 'critique';
export type TitrologieRisque = 'VERT' | 'ORANGE' | 'ROUGE';

export type AngleKey = 'politique' | 'social' | 'economique' | 'numerique_telecom' | 'reputationnel';

export type EntiteLien = 'ANSUT' | 'MTNIT' | 'SERVICE_UNIVERSEL';

export interface AngleLien {
  entite: EntiteLien;
  phrase: string;          // explication 1 phrase
  preuve?: string | null;  // citation/extrait factuel
  sources?: string[];      // URLs de référence
}

export interface AngleAnalyse {
  intensite: 0 | 1 | 2 | 3;
  lecture?: string | null;
  lien_ansut_mtnd?: string | null; // legacy fallback
  liens?: AngleLien[];
}

export type UneAngles = Partial<Record<AngleKey, AngleAnalyse>>;

export interface UneJournal {
  journal: string;
  type: 'nationale' | 'en_ligne' | 'economique';
  titre: string;
  resume: string;
  url: string;
  sujet: TitrologieSujet;
  ton: TitrologieTon;
  risque_ansut: TitrologieRisque;
  lien_ansut: string;
  angles?: UneAngles;
  risque_score?: number;
  risque_signals?: string[];
}

export interface TitrologieRisqueDistribution {
  ROUGE: number;
  ORANGE: number;
  VERT: number;
}

export interface TitrologieSyntheseCodir {
  sujets_dominants: string[];
  impact_ansut: string[];
  opportunite_communication: string | null;
  risque_a_surveiller: string | null;
  action_recommandee: string;
  risque_distribution?: TitrologieRisqueDistribution;
  risque_global?: TitrologieRisque;
  score_global?: number;
  top_risques?: Array<{ journal: string; titre: string; score: number; risque: TitrologieRisque; signals: string[] }>;
}

export interface TitrologieData {
  unes: UneJournal[];
  synthese_codir: TitrologieSyntheseCodir | null;
  signaux_ansut: string[];
  generated_at: string;
}

export type MatinaleSectionKey =
  | 'priorite_executive'
  | 'synthese_60s'
  | 'titrologie'
  | 'veille_par_pilier'
  | 'lecture_strategique'
  | 'impact_projets_ansut'
  | 'actions_immediates'
  | 'reputation_ansut'
  | 'signaux_faibles'
  | 'revue_de_presse'
  | 'activite_ansut';
