// Types pour le Studio Newsletter visuel avec éditeur de blocs

export type BlockType = 
  | 'header' 
  | 'edito' 
  | 'article' 
  | 'tech' 
  | 'chiffre' 
  | 'agenda' 
  | 'image' 
  | 'separator' 
  | 'button' 
  | 'footer'
  | 'text';

export interface BlockStyle {
  backgroundColor?: string;
  padding?: string;
  textColor?: string;
  borderRadius?: string;
  borderColor?: string;
  fontSize?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface NewsletterBlock {
  id: string;
  type: BlockType;
  content: Record<string, string | number | boolean | undefined>;
  style: BlockStyle;
  order: number;
}

export interface GlobalStyles {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  maxWidth: string;
  backgroundColor: string;
}

export interface NewsletterDocument {
  blocks: NewsletterBlock[];
  globalStyles: GlobalStyles;
  metadata: {
    newsletterId: string;
    template: 'innovactu' | 'ansut_radar';
    numero: number;
    dateDebut: string;
    dateFin: string;
  };
}

// Props pour les composants de blocs
export interface BlockProps {
  block: NewsletterBlock;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (content: Record<string, string | number | boolean | undefined>) => void;
  onStyleUpdate: (style: Partial<BlockStyle>) => void;
}

// Définition d'un type de bloc disponible dans la toolbar
export interface BlockDefinition {
  type: BlockType;
  label: string;
  icon: string;
  description: string;
  defaultContent: Record<string, string | number | boolean | undefined>;
  defaultStyle: BlockStyle;
}

// Configuration des blocs disponibles
export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: 'header',
    label: 'En-tête',
    icon: '📰',
    description: 'Bandeau avec logo ANSUT',
    defaultContent: { 
      title: 'ANSUT RADAR', 
      subtitle: 'Newsletter Stratégique',
      showLogo: true 
    },
    defaultStyle: { 
      backgroundColor: '#1a237e', 
      textColor: '#ffffff', 
      padding: '24px' 
    }
  },
  {
    type: 'edito',
    label: 'Édito',
    icon: '📝',
    description: 'Introduction éditoriale',
    defaultContent: { 
      text: 'Votre édito ici...', 
      author: 'La Rédaction ANSUT' 
    },
    defaultStyle: { 
      backgroundColor: '#ffffff', 
      padding: '24px',
      borderColor: '#e65100' 
    }
  },
  {
    type: 'article',
    label: 'Article',
    icon: '📰',
    description: 'Article avec titre et contenu',
    defaultContent: { 
      title: 'Titre de l\'article', 
      pourquoi: 'Pourquoi c\'est important...', 
      impact: 'Impact concret...',
      imageUrl: ''
    },
    defaultStyle: { 
      backgroundColor: '#fff8f0', 
      padding: '20px',
      borderRadius: '12px',
      borderColor: '#e65100' 
    }
  },
  {
    type: 'tech',
    label: 'Tendance Tech',
    icon: '🔬',
    description: 'Bloc technologie',
    defaultContent: { 
      title: 'Tendance Tech', 
      content: 'Contenu...',
      lienAnsut: 'Lien avec l\'ANSUT...',
      imageUrl: ''
    },
    defaultStyle: { 
      backgroundColor: '#e3f2fd', 
      padding: '24px',
      borderRadius: '12px' 
    }
  },
  {
    type: 'chiffre',
    label: 'Chiffre clé',
    icon: '📊',
    description: 'Chiffre marquant',
    defaultContent: { 
      valeur: '100', 
      unite: '%', 
      contexte: 'Contexte du chiffre...' 
    },
    defaultStyle: { 
      backgroundColor: '#1a237e', 
      textColor: '#ffffff',
      padding: '48px',
      textAlign: 'center' 
    }
  },
  {
    type: 'agenda',
    label: 'Agenda',
    icon: '📅',
    description: 'Événements à venir',
    defaultContent: { 
      items: '[]' 
    },
    defaultStyle: { 
      backgroundColor: '#f3e5f5', 
      padding: '24px',
      borderRadius: '12px' 
    }
  },
  {
    type: 'image',
    label: 'Image',
    icon: '🖼️',
    description: 'Image libre',
    defaultContent: { 
      url: '', 
      alt: 'Description de l\'image',
      caption: '' 
    },
    defaultStyle: { 
      padding: '0px',
      borderRadius: '8px' 
    }
  },
  {
    type: 'separator',
    label: 'Séparateur',
    icon: '➖',
    description: 'Ligne de séparation',
    defaultContent: { 
      style: 'line' 
    },
    defaultStyle: { 
      padding: '16px',
      borderColor: '#e0e0e0' 
    }
  },
  {
    type: 'button',
    label: 'Bouton',
    icon: '🔗',
    description: 'Bouton d\'action',
    defaultContent: { 
      text: 'En savoir plus', 
      url: '#',
      variant: 'primary' 
    },
    defaultStyle: { 
      backgroundColor: '#e65100',
      textColor: '#ffffff', 
      padding: '12px 24px',
      borderRadius: '8px',
      textAlign: 'center' 
    }
  },
  {
    type: 'footer',
    label: 'Pied de page',
    icon: '📋',
    description: 'Footer avec infos ANSUT',
    defaultContent: { 
      address: 'ANSUT - Plateau, Abidjan',
      phone: '',
      email: '',
      unsubscribeText: 'Se désabonner' 
    },
    defaultStyle: { 
      backgroundColor: '#f5f5f5', 
      textColor: '#666666',
      padding: '32px',
      textAlign: 'center' 
    }
  },
  {
    type: 'text',
    label: 'Texte libre',
    icon: '📝',
    description: 'Paragraphe de texte',
    defaultContent: { 
      text: 'Votre texte ici...' 
    },
    defaultStyle: { 
      backgroundColor: 'transparent', 
      padding: '16px',
      fontSize: '14px' 
    }
  }
];
