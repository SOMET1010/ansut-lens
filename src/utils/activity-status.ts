/**
 * Catégorisation de l'activité utilisateur pour les indicateurs visuels.
 * Utilisé dans UserCard et UsersPage pour un rendu cohérent.
 */

export type ActivityCategory = 'disabled' | 'pending' | 'password_not_set' | 'never_connected' | 'dormant' | 'online' | 'active';

const ONLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const DORMANT_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

export function getActivityCategory(
  lastActiveAt: string | null,
  isEmailConfirmed: boolean,
  isDisabled: boolean,
  passwordSetAt?: string | null
): ActivityCategory {
  if (isDisabled) return 'disabled';
  if (!isEmailConfirmed) return 'pending';
  if (passwordSetAt === null || passwordSetAt === undefined) return 'password_not_set';
  if (!lastActiveAt) return 'never_connected';

  const diffMs = Date.now() - new Date(lastActiveAt).getTime();

  if (diffMs < ONLINE_THRESHOLD_MS) return 'online';
  if (diffMs > DORMANT_THRESHOLD_MS) return 'dormant';
  return 'active';
}

/** Formater la dernière activité de manière intelligente */
export function formatLastActivity(lastActiveAt: string | null): string {
  if (!lastActiveAt) return 'Jamais connecté';

  const now = new Date();
  const lastActive = new Date(lastActiveAt);
  const diffMs = now.getTime() - lastActive.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 5) return 'À l\'instant';
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) {
    return `Hier ${lastActive.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays < 7) return `Il y a ${diffDays} jours`;

  return lastActive.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** Formater la date précise pour les tooltips */
export function formatExactDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Obtenir les initiales d'un nom */
export function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
