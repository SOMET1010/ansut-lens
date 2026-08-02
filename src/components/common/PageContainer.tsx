interface PageContainerProps {
  children: React.ReactNode;
  /**
   * Largeur maximale du contenu.
   * `lecture` pour les pages de texte et de formulaire, `large` pour les
   * tableaux de bord et les tableaux de donnees.
   */
  largeur?: 'lecture' | 'large' | 'pleine';
  className?: string;
}

const LARGEURS: Record<NonNullable<PageContainerProps['largeur']>, string> = {
  lecture: 'max-w-4xl',
  large: 'max-w-7xl',
  pleine: 'max-w-none',
};

/**
 * Conteneur de page a espacement responsive.
 *
 * Le layout precedent appliquait un `p-6` fixe : 24 pixels de marge perdus de
 * chaque cote sur un ecran de telephone, et aucune limite de largeur sur un
 * grand ecran, ce qui produisait des lignes de texte illisibles. Ce conteneur
 * adapte l'espacement au format et borne la largeur utile.
 */
export function PageContainer({ children, largeur = 'large', className }: PageContainerProps) {
  return (
    <div
      className={`mx-auto w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 ${LARGEURS[largeur]} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
