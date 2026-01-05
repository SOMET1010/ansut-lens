// Types pour les newsletters intelligentes ANSUT RADAR

export type NewsletterPeriode = 'hebdo' | 'mensuel';
export type NewsletterTon = 'institutionnel' | 'pedagogique' | 'strategique';
export type NewsletterCible = 'dg_ca' | 'partenaires' | 'general';
export type NewsletterStatut = 'brouillon' | 'en_revision' | 'valide' | 'envoye' | 'archive';
export type ProgrammationFrequence = 'hebdo' | 'mensuel' | 'desactive';

export interface NewsletterEssentiel {
  titre: string;
  pourquoi: string;
  impact: string;
  actualite_id?: string;
  image_url?: string;
  image_alt?: string;
}

export interface NewsletterTendance {
  titre: string;
  contenu: string;
  lien_ansut: string;
  image_url?: string;
  image_alt?: string;
}

export interface NewsletterHeader {
  image_url?: string;
  image_alt?: string;
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
  header?: NewsletterHeader;
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
  // Champs de programmation
  programmation_active: boolean;
  date_envoi_programme: string | null;
  rappel_envoye: boolean;
  date_rappel: string | null;
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

export interface NewsletterProgrammation {
  id: string;
  frequence: ProgrammationFrequence;
  jour_envoi: number;
  heure_envoi: string;
  ton_defaut: NewsletterTon;
  cible_defaut: NewsletterCible;
  delai_rappel_heures: number;
  emails_rappel: string[];
  actif: boolean;
  derniere_generation: string | null;
  prochain_envoi: string | null;
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
