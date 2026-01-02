/**
 * Utilitaires de gestion d'erreurs typées
 * Évite l'utilisation de `any` dans les blocs catch
 */

/**
 * Vérifie si une valeur ressemble à une erreur (possède une propriété message)
 */
export function isErrorLike(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}

/**
 * Extrait un message d'erreur lisible depuis une valeur inconnue
 * Utilisé dans les blocs catch pour remplacer `error: any`
 */
export function toErrorMessage(error: unknown): string {
  if (isErrorLike(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Une erreur inattendue est survenue';
}
