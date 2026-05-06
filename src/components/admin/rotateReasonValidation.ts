export const sanitizeReason = (raw: string): string =>
  raw
    .replace(/[\u0000-\u001F\u007F]/g, ' ') // control chars
    .replace(/\s+/g, ' ')                    // collapse whitespace
    .trim()
    .slice(0, 500);

export const validateReason = (raw: string): string | null => {
  const cleaned = sanitizeReason(raw);
  if (cleaned.length < 10)
    return 'Motif trop court — décrivez la raison en au moins 10 caractères.';
  if (cleaned.length > 500)
    return 'Motif trop long (500 caractères maximum).';
  const letters = (cleaned.match(/\p{L}/gu) || []).length;
  if (letters < 5)
    return 'Le motif doit contenir au moins 5 lettres (texte explicatif requis).';
  if (/^(.)\1{4,}$/.test(cleaned))
    return 'Motif invalide (caractère répété).';
  if (/^[^\p{L}\p{N}]+$/u.test(cleaned))
    return 'Le motif ne peut pas contenir uniquement des symboles.';
  return null;
};
