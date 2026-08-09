/**
 * Traduit une erreur d'authentification Supabase en message français.
 *
 * Priorité : le `code` d'erreur (stable, versionné par Supabase) → un motif
 * reconnu dans le message brut anglais (repli pour les anciennes versions ou
 * les erreurs réseau) → un message générique honnête.
 *
 * On ne relaie JAMAIS le message brut Supabase à l'utilisateur : l'interface
 * est 100 % française et « Invalid login credentials » n'aide personne.
 */

interface SupabaseAuthErrorLike {
  code?: string;
  status?: number;
  message?: string;
}

const PAR_CODE: Record<string, string> = {
  invalid_credentials: 'Email ou mot de passe incorrect.',
  email_not_confirmed: "Votre email n'est pas encore confirmé. Vérifiez votre boîte mail.",
  user_not_found: 'Aucun compte ne correspond à cet email.',
  invalid_email: "Format d'email invalide.",
  email_address_invalid: "Format d'email invalide.",
  validation_failed: "Format d'email invalide.",
  weak_password: 'Mot de passe trop faible (au moins 6 caractères).',
  over_request_rate_limit: 'Trop de tentatives, réessayez dans quelques minutes.',
  over_email_send_rate_limit: "Trop d'envois d'emails, patientez quelques minutes avant de réessayer.",
  too_many_requests: 'Trop de tentatives, réessayez dans quelques minutes.',
  user_banned: 'Ce compte est temporairement suspendu. Contactez un administrateur.',
  session_expired: 'Votre session a expiré, reconnectez-vous.',
  signup_disabled: 'Les inscriptions sont désactivées.',
};

// Repli par motif du message brut (versions supabase-js sans champ `code`).
const PAR_MOTIF: [RegExp, string][] = [
  [/invalid login credentials/i, 'Email ou mot de passe incorrect.'],
  [/email not confirmed/i, "Votre email n'est pas encore confirmé. Vérifiez votre boîte mail."],
  [/user not found/i, 'Aucun compte ne correspond à cet email.'],
  [/rate limit|too many requests/i, 'Trop de tentatives, réessayez dans quelques minutes.'],
  [/password.*(short|weak|least|6)/i, 'Mot de passe trop faible (au moins 6 caractères).'],
  [/network|fetch failed|failed to fetch|load failed/i, 'Connexion au serveur impossible. Vérifiez votre réseau.'],
];

const GENERIQUE = 'Connexion impossible. Réessayez ou contactez un administrateur.';

export function messageErreurAuth(error: unknown): string {
  if (!error) return GENERIQUE;
  const e = error as SupabaseAuthErrorLike;
  if (e.code && PAR_CODE[e.code]) return PAR_CODE[e.code];
  if (e.status === 429) return 'Trop de tentatives, réessayez dans quelques minutes.';
  const msg = e.message || '';
  for (const [re, fr] of PAR_MOTIF) {
    if (re.test(msg)) return fr;
  }
  return GENERIQUE;
}
