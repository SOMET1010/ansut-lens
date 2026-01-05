// Types pour les newsletters intelligentes ANSUT RADAR

export type NewsletterPeriode = 'hebdo' | 'mensuel';
export type NewsletterTon = 'institutionnel' | 'pedagogique' | 'strategique';
export type NewsletterCible = 'dg_ca' | 'partenaires' | 'general';
export type NewsletterStatut = 'brouillon' | 'en_revision' | 'valide' | 'envoye' | 'archive';

export interface NewsletterEssentiel {
  titre: string;
  pourquoi: string;
  impact: string;
  actualite_id?: string;
}

export interface NewsletterTendance {
  titre: string;
  contenu: string;
  lien_ansut: string;
}

export interface NewsletterDecryptage {
  titre: string;
  contenu: string;
}

export interface NewsletterChiffre {
  valeur: string;
  unite: string;
  contexte: string;
}

export interface NewsletterAVenir {
  type: 'evenement' | 'appel_projets' | 'deploiement' | 'decision';
  titre: string;
  date?: string;
}

export interface NewsletterContenu {
  edito: {
    texte: string;
    genere_par_ia: boolean;
  };
  essentiel_ansut: NewsletterEssentiel[];
  tendance_tech: NewsletterTendance;
  decryptage: NewsletterDecryptage;
  chiffre_marquant: NewsletterChiffre;
  a_venir: NewsletterAVenir[];
}

export interface Newsletter {
  id: string;
  numero: number;
  periode: NewsletterPeriode;
  date_debut: string;
  date_fin: string;
  ton: NewsletterTon;
  cible: NewsletterCible;
  contenu: NewsletterContenu;
  html_court: string | null;
  html_complet: string | null;
  html_social: string | null;
  statut: NewsletterStatut;
  genere_par: string | null;
  valide_par: string | null;
  date_validation: string | null;
  date_envoi: string | null;
  nb_destinataires: number;
  created_at: string;
  updated_at: string;
}

export interface NewsletterDestinataire {
  id: string;
  email: string;
  nom: string | null;
  type: NewsletterCible | 'externe';
  actif: boolean;
  frequence: NewsletterPeriode | 'tous';
  derniere_reception: string | null;
  nb_receptions: number;
  created_at: string;
  updated_at: string;
}

export interface GenerateNewsletterParams {
  periode: NewsletterPeriode;
  ton: NewsletterTon;
  cible: NewsletterCible;
  date_debut?: string;
  date_fin?: string;
}
