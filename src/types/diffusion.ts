export interface Destinataire {
  nom: string;
  numero?: string;
  chat_id?: string;
  email?: string;
}

export type CanalDiffusion = 'sms' | 'telegram' | 'email' | 'whatsapp';

export interface DiffusionProgrammation {
  id: string;
  canal: CanalDiffusion;
  actif: boolean;
  frequence: string;
  heure_envoi: string;
  jours_envoi: number[] | null;
  destinataires: Destinataire[];
  contenu_type: string;
  dernier_envoi: string | null;
  prochain_envoi: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiffusionLog {
  id: string;
  canal: CanalDiffusion;
  contenu_type: string;
  message: string | null;
  destinataires_count: number;
  succes_count: number;
  echec_count: number;
  details: Record<string, unknown> | null;
  created_at: string;
}
