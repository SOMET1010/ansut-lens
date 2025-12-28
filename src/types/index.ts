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

export interface Personnalite {
  id: string;
  nom: string;
  prenom?: string;
  fonction?: string;
  organisation?: string;
  categorie?: 'operateur' | 'regulateur' | 'expert' | 'politique' | 'media' | 'autre';
  photo_url?: string;
  bio?: string;
  score_influence: number;
  reseaux?: Record<string, string>;
  tags?: string[];
  derniere_activite?: string;
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
