/**
 * Affichage honnête des dates de publication.
 *
 * On ne dispose pas toujours de la date de publication d'origine (les réseaux
 * scrappés ne l'exposent pas toujours). Quand elle est connue et nettement
 * antérieure à la collecte, on l'affiche (« Publié … »). Sinon on n'invente
 * rien : on indique la date de COLLECTE (« Collecté … ») en signalant que la
 * date d'origine n'est pas vérifiée. Évite de faire passer un contenu ancien
 * pour récent.
 */

export interface DateAffichage {
  mode: 'publie' | 'collecte';
  date: string;
}

export function choisirDatePublication(pub: {
  date_publication: string | null;
  collecte_le: string | null;
}): DateAffichage | null {
  const pubMs = pub.date_publication ? new Date(pub.date_publication).getTime() : NaN;
  const colMs = pub.collecte_le ? new Date(pub.collecte_le).getTime() : NaN;
  const dateReelle =
    !Number.isNaN(pubMs) && (Number.isNaN(colMs) || colMs - pubMs > 24 * 3600 * 1000);
  if (dateReelle) return { mode: 'publie', date: pub.date_publication as string };
  if (!Number.isNaN(colMs)) return { mode: 'collecte', date: pub.collecte_le as string };
  return null;
}
