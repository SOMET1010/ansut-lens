// ANSUT RADAR Types

export type AppRole = 'admin' | 'user' | 'council_user' | 'guest';

export type ViewMode = 'dg' | 'analyste' | 'crise';

export type QuadrantType = 'tech' | 'regulation' | 'market' | 'reputation';

export type SignalLevel = 'info' | 'warning' | 'critical';

export type Tendance = 'up' | 'down' | 'stable';

export type SentimentValue = number; // -1 to 1

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  department?: string;
  role: AppRole;
}

export interface Signal {
  id: string;
  titre: string;
  description?: string;
  quadrant: QuadrantType;
  niveau: SignalLevel;
  score_impact: number;
  tendance?: Tendance;
  source_type?: string;
  source_id?: string;
  actif: boolean;
  date_detection: string;
}

export interface Actualite {
  id: string;
  titre: string;
  resume?: string;
  contenu?: string;
  source_nom?: string;
  source_url?: string;
  date_publication?: string;
  importance: number;
  tags?: string[];
  categorie?: string;
  analyse_ia?: string;
  pourquoi_important?: string;
  sentiment?: SentimentValue;
}

export interface Mention {
  id: string;
  contenu: string;
  source?: string;
  source_url?: string;
  auteur?: string;
  date_mention?: string;
  sentiment?: SentimentValue;
  score_influence: number;
  est_critique: boolean;
  traite: boolean;
  suggestion_reaction?: string;
}

// Cercles stratégiques (1 = priorité absolue, 4 = veille)
export type CercleStrategique = 1 | 2 | 3 | 4;

// Sous-catégories par cercle
export type SousCategorieActeur = 
  // Cercle 1 - Institutionnels Nationaux
  | 'tutelle_mtnd'
  | 'regulation_artci'
  | 'gouvernance_ansut'
  // Cercle 2 - Opérateurs, FAI & Connectivité
  | 'operateurs_mobiles'
  | 'fai_internet'
  | 'fintech_mobile_money'
  | 'equipementiers'
  | 'associations_sectorielles'
  // Cercle 3 - Bailleurs & Internationaux
  | 'bailleurs_financeurs'
  | 'organisations_africaines'
  | 'normalisation_standards'
  // Cercle 4 - Experts & Médias
  | 'medias_analystes'
  | 'academique_formation'
  | 'consultants_influenceurs';

// Niveaux d'alerte par acteur
export type NiveauAlerte = 'normal' | 'eleve' | 'critique';

// Configuration des alertes par type d'événement
export interface AlertesConfig {
  changement_position?: boolean;
  annonce_majeure?: boolean;
  polemique?: boolean;
  financement?: boolean;
  // Spécifiques FAI
  panne_service?: boolean;
  retrait_zone?: boolean;
  // Spécifiques Fintech
  incident_paiement?: boolean;
  controverse_reglementaire?: boolean;
}

// Catégories d'acteurs
export type CategorieActeur = 'operateur' | 'regulateur' | 'expert' | 'politique' | 'media' | 'bailleur' | 'fai' | 'fintech' | 'autre';

// Interface Personnalité enrichie
export interface Personnalite {
  id: string;
  nom: string;
  prenom?: string;
  fonction?: string;
  organisation?: string;
  categorie?: CategorieActeur;
  sous_categorie?: SousCategorieActeur;
  cercle: CercleStrategique;
  pays?: string;
  zone?: string;
  photo_url?: string;
  bio?: string;
  score_influence: number;
  reseaux?: Record<string, string>;
  thematiques?: string[];
  sources_suivies?: {
    twitter?: string;
    linkedin?: string;
    presse?: string[];
    communiques?: string[];
  };
  alertes_config?: AlertesConfig;
  niveau_alerte?: NiveauAlerte;
  tags?: string[];
  derniere_activite?: string;
  actif?: boolean;
  notes?: string;
  created_at?: string;
}

export interface Alerte {
  id: string;
  type: 'mention' | 'actualite' | 'personnalite' | 'signal' | 'systeme';
  niveau: SignalLevel;
  titre: string;
  message?: string;
  reference_type?: string;
  reference_id?: string;
  lue: boolean;
  traitee: boolean;
  created_at: string;
}

export interface ConversationIA {
  id: string;
  titre?: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  sources?: string[];
}

export interface SourceMedia {
  id: string;
  nom: string;
  type: 'web' | 'rss' | 'twitter' | 'linkedin' | 'autre';
  url?: string;
  frequence_scan: string;
  actif: boolean;
  derniere_collecte?: string;
}

export interface KPIData {
  label: string;
  value: number | string;
  change?: number;
  trend?: Tendance;
  icon?: string;
}

export interface RadarQuadrant {
  id: QuadrantType;
  label: string;
  signals: Signal[];
  color: string;
}

// === SPDI - Score de Présence Digitale Institutionnelle ===

// Niveaux d'interprétation du score
export type InterpretationSPDI = 
  | 'presence_forte'      // 80-100
  | 'presence_solide'     // 60-79
  | 'visibilite_faible'   // 40-59
  | 'risque_invisibilite'; // <40

// Type de recommandation
export type TypeRecommandationSPDI = 'opportunite' | 'alerte' | 'canal' | 'thematique';

// Priorité de recommandation
export type PrioriteRecommandation = 'haute' | 'normale' | 'basse';

// Canal de communication
export type CanalCommunication = 'linkedin' | 'presse' | 'conference' | 'communique';

// Axes du score composite
export interface AxesSPDI {
  visibilite: {
    score: number;
    nb_mentions: number;
    nb_sources: number;
    regularite: number;
  };
  qualite: {
    score: number;
    sentiment_moyen: number;
    themes_strategiques: number;
    controverses: number;
  };
  autorite: {
    score: number;
    citations_directes: number;
    invitations_panels: number;
    references_croisees: number;
  };
  presence: {
    score: number;
    activite_linkedin: number;
    engagement: number;
    coherence: number;
  };
}

// Métrique SPDI journalière
export interface MetriqueSPDI {
  id: string;
  personnalite_id: string;
  date_mesure: string;
  axes: AxesSPDI;
  score_final: number;
  interpretation: InterpretationSPDI;
  created_at: string;
}

// Recommandation IA
export interface RecommandationSPDI {
  id: string;
  personnalite_id: string;
  type: TypeRecommandationSPDI;
  priorite: PrioriteRecommandation;
  titre: string;
  message: string;
  thematique?: string;
  canal?: CanalCommunication;
  actif: boolean;
  vue: boolean;
  created_at: string;
  expire_at?: string;
}

// Évolution du score sur une période
export interface EvolutionSPDI {
  periode: '7j' | '30j' | '90j';
  historique: { date: string; score: number }[];
  variation: number;
  tendance: Tendance;
}

// Extension de Personnalite avec SPDI
export interface PersonnaliteAvecSPDI extends Personnalite {
  suivi_spdi_actif: boolean;
  score_spdi_actuel: number;
  tendance_spdi: Tendance;
  derniere_mesure_spdi?: string;
  axes_spdi?: AxesSPDI;
  recommandations?: RecommandationSPDI[];
}
