// Re-signature automatique des images de newsletter au moment de l'envoi.
//
// Les visuels sont stockés dans un bucket privé ; le HTML enregistré contient
// des URLs signées qui peuvent avoir expiré entre la rédaction et l'envoi.
// Avant chaque envoi, on régénère une URL signée fraîche pour chaque image.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const BUCKET_IMAGES_PRIVEES = "newsletter-images-privees";
// Durée de validité des liens envoyés dans les emails (1 an).
export const TTL_SIGNATURE_SECONDS = 60 * 60 * 24 * 365;

/** Extrait le chemin objet d'une URL de storage (signée ou publique). */
export function extraireCheminStorage(url: string): string | null {
  const motif = new RegExp(
    `/storage/v1/object/(?:sign|public|authenticated)/${BUCKET_IMAGES_PRIVEES}/([^"'\\s?]+)`,
  );
  const trouve = url.match(motif);
  if (!trouve) return null;
  try {
    return decodeURIComponent(trouve[1]);
  } catch {
    return trouve[1];
  }
}

/**
 * Remplace toutes les URLs du bucket privé présentes dans le HTML par des
 * URLs signées fraîches. Les URLs non reconnues sont laissées intactes.
 */
export async function signerImagesNewsletter(
  client: SupabaseClient,
  html: string | null | undefined,
): Promise<{ html: string; signees: number; echecs: number }> {
  if (!html) return { html: html ?? "", signees: 0, echecs: 0 };

  const motifGlobal = new RegExp(
    `https?://[^"'\\s]*?/storage/v1/object/(?:sign|public|authenticated)/${BUCKET_IMAGES_PRIVEES}/[^"'\\s>]+`,
    "g",
  );
  const urls = Array.from(new Set(html.match(motifGlobal) ?? []));
  if (urls.length === 0) return { html, signees: 0, echecs: 0 };

  let signees = 0;
  let echecs = 0;
  let resultat = html;

  for (const url of urls) {
    const chemin = extraireCheminStorage(url);
    if (!chemin) {
      echecs++;
      continue;
    }
    const { data, error } = await client.storage
      .from(BUCKET_IMAGES_PRIVEES)
      .createSignedUrl(chemin, TTL_SIGNATURE_SECONDS);

    if (error || !data?.signedUrl) {
      console.error(`[signerImagesNewsletter] Échec signature ${chemin}:`, error?.message);
      echecs++;
      continue;
    }

    resultat = resultat.split(url).join(data.signedUrl);
    signees++;
  }

  return { html: resultat, signees, echecs };
}
