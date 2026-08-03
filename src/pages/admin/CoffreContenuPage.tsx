import { CoffreContenu } from '@/components/dossiers/CoffreContenu';

/**
 * Route d'administration du coffre à contenus.
 *
 * Le coffre est une brique éditoriale : sa vraie place est dans le produit,
 * sous l'onglet « Coffre » de Publier. Cette page n'en est qu'un point d'accès
 * de transition depuis la console d'administration ; le composant réel est
 * partagé avec l'onglet produit pour qu'il n'existe qu'une seule implémentation.
 */
export default function CoffreContenuPage() {
  return <CoffreContenu />;
}
