// Garde-fou anti « email bombing » partagé par les endpoints publics d'email.
// S'appuie sur la fonction SQL atomique `consommer_quota_email` (fenêtre glissante
// en base, cohérente entre toutes les instances des edge functions).
// Audit santé P2 #25.

// deno-lint-ignore no-explicit-any
type AdminClient = any;

export interface QuotaEmail {
  cle: string;
  max: number;
  fenetreSecondes: number;
}

/**
 * Vérifie et consomme un quota. Renvoie true si la requête est autorisée.
 *
 * Choix délibéré : en cas d'erreur du limiteur (RPC indisponible), on laisse
 * passer (fail-open) plutôt que de bloquer une réinitialisation légitime — mais
 * on trace l'incident. Un email bombing ne doit jamais pouvoir se cacher
 * derrière une panne silencieuse du limiteur, d'où le log.
 */
export async function consommerQuota(
  admin: AdminClient,
  quota: QuotaEmail,
): Promise<boolean> {
  const { data, error } = await admin.rpc('consommer_quota_email', {
    p_cle: quota.cle,
    p_max: quota.max,
    p_fenetre_secondes: quota.fenetreSecondes,
  });
  if (error) {
    console.error('[emailRateLimit] RPC consommer_quota_email en erreur:', error.message);
    return true; // fail-open tracé
  }
  return data === true;
}

/** Extrait une IP cliente exploitable comme clé de quota (best-effort). */
export function ipCliente(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? 'inconnue';
}

/**
 * Applique deux garde-fous : par adresse (empêche le harcèlement d'une boîte)
 * et par IP (empêche l'arrosage de nombreuses adresses depuis une même source).
 * Renvoie true si l'envoi est autorisé.
 */
export async function autoriserEnvoiEmail(
  admin: AdminClient,
  req: Request,
  emailNormalise: string,
  prefixe: string,
): Promise<boolean> {
  const parEmail = await consommerQuota(admin, {
    cle: `${prefixe}:email:${emailNormalise}`,
    max: 3,
    fenetreSecondes: 15 * 60, // 3 emails / 15 min pour une même adresse
  });
  const parIp = await consommerQuota(admin, {
    cle: `${prefixe}:ip:${ipCliente(req)}`,
    max: 15,
    fenetreSecondes: 60 * 60, // 15 emails / heure pour une même IP
  });
  return parEmail && parIp;
}
