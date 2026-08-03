import { VeilleDirigeants } from "@/components/acteurs/VeilleDirigeants";

/**
 * Route d'administration de la veille des dirigeants (ancien « Shadow Tracker »).
 *
 * La veille des dirigeants est une brique de connaissance des acteurs : sa vraie
 * place est dans le produit, sous l'onglet « Veille dirigeants » d'Acteurs. Cette
 * page n'en est qu'un point d'accès de transition depuis la console
 * d'administration ; le composant réel est partagé avec l'onglet produit pour
 * qu'il n'existe qu'une seule implémentation.
 */
export default function ShadowTrackerPage() {
  return <VeilleDirigeants />;
}
