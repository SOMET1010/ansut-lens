/**
 * Centralised, localised messages for the rotation/revoke "motif" field.
 * Single source of truth — used by the validation module, the dialog UI
 * (placeholder, helper text, inline errors, toasts) and the unit tests.
 */
export const REASON_MESSAGES = {
  // Validation errors (returned by validateReason)
  tooShort: 'Motif trop court — décrivez la raison en au moins 10 caractères.',
  tooLong: 'Motif trop long — 500 caractères maximum.',
  needsLetters:
    'Motif insuffisant — au moins 5 lettres requises pour un texte explicatif.',
  repeated: 'Motif invalide — caractère répété, merci de détailler la raison.',
  onlySymbols:
    'Motif invalide — il ne peut pas contenir uniquement des symboles.',

  // UI helper / hint texts
  fieldLabel: 'Motif',
  fieldRequiredMark: '*',
  helper:
    'Min. 10 caractères, texte explicatif. Espaces et caractères de contrôle nettoyés avant enregistrement.',
  placeholder:
    "Ex : Token compromis, rotation périodique trimestrielle, départ d'un agent…",

  // Live preview labels
  previewTitle: "Version qui sera enregistrée dans le journal d'audit",
  previewEmpty: '(vide après nettoyage — saisissez un texte explicatif)',
  previewCleanedNote:
    'Espaces multiples, sauts de ligne et caractères de contrôle ont été nettoyés.',

  // Toast confirmation prefix (used after successful rotation/revocation)
  savedReasonPrefix: 'Motif enregistré',
} as const;

export const sanitizeReason = (raw: string): string =>
  raw
    .replace(/[\u0000-\u001F\u007F]/g, ' ') // control chars
    .replace(/\s+/g, ' ')                    // collapse whitespace
    .trim()
    .slice(0, 500);

export const validateReason = (raw: string): string | null => {
  const cleaned = sanitizeReason(raw);
  if (cleaned.length < 10) return REASON_MESSAGES.tooShort;
  if (cleaned.length > 500) return REASON_MESSAGES.tooLong;
  const letters = (cleaned.match(/\p{L}/gu) || []).length;
  if (letters < 5) return REASON_MESSAGES.needsLetters;
  if (/^(.)\1{4,}$/.test(cleaned)) return REASON_MESSAGES.repeated;
  if (/^[^\p{L}\p{N}]+$/u.test(cleaned)) return REASON_MESSAGES.onlySymbols;
  return null;
};
