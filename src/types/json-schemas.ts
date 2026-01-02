/**
 * Schémas Zod pour valider les champs JSONB de la base de données
 * Remplace les casts `as any` par des validations typées
 */

import { z } from 'zod';

// Schema pour la configuration des alertes
export const AlertesConfigSchema = z.object({
  changement_position: z.boolean().optional(),
  annonce_majeure: z.boolean().optional(),
  polemique: z.boolean().optional(),
  financement: z.boolean().optional(),
  // Spécifiques FAI
  panne_service: z.boolean().optional(),
  retrait_zone: z.boolean().optional(),
  // Spécifiques Fintech
  incident_paiement: z.boolean().optional(),
  controverse_reglementaire: z.boolean().optional(),
}).passthrough();

// Schema pour les réseaux sociaux (clé-valeur string)
export const ReseauxSchema = z.record(z.string(), z.string());

// Schema pour les sources suivies
export const SourcesSuiviesSchema = z.object({
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  presse: z.array(z.string()).optional(),
  communiques: z.array(z.string()).optional(),
}).passthrough();

// Types inférés depuis les schémas
export type AlertesConfig = z.infer<typeof AlertesConfigSchema>;
export type Reseaux = z.infer<typeof ReseauxSchema>;
export type SourcesSuivies = z.infer<typeof SourcesSuiviesSchema>;

/**
 * Parse sécurisé de la configuration des alertes
 */
export function parseAlertesConfig(data: unknown): AlertesConfig | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const result = AlertesConfigSchema.safeParse(data);
  return result.success ? result.data : undefined;
}

/**
 * Parse sécurisé des réseaux sociaux
 */
export function parseReseaux(data: unknown): Reseaux | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const result = ReseauxSchema.safeParse(data);
  return result.success ? result.data : {};
}

/**
 * Parse sécurisé des sources suivies
 */
export function parseSourcesSuivies(data: unknown): SourcesSuivies | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const result = SourcesSuiviesSchema.safeParse(data);
  return result.success ? result.data : undefined;
}
