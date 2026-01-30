// Utilitaires de conversion entre le format NewsletterContenu et NewsletterDocument

import type { Newsletter, NewsletterContenu, NewsletterAVenir } from '@/types/newsletter';
import type { NewsletterDocument, NewsletterBlock, GlobalStyles } from '@/types/newsletter-studio';

/**
 * Génère un ID unique pour un bloc
 */
function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convertit le contenu JSON d'une newsletter en document éditable avec blocs
 */
export function contenuToDocument(newsletter: Newsletter): NewsletterDocument {
  const { contenu } = newsletter;
  const blocks: NewsletterBlock[] = [];
  let order = 0;

  // Header
  blocks.push({
    id: generateBlockId(),
    type: 'header',
    content: {
      title: newsletter.template === 'ansut_radar' ? 'ANSUT RADAR' : 'INNOV\'ACTU',
      subtitle: 'Newsletter Stratégique',
      showLogo: true,
      numero: newsletter.numero,
      headerImageUrl: contenu.header?.image_url || '',
      headerImageAlt: contenu.header?.image_alt || ''
    },
    style: {
      backgroundColor: newsletter.template === 'ansut_radar' ? '#0f172a' : '#1a237e',
      textColor: '#ffffff',
      padding: '24px'
    },
    order: order++
  });

  // Édito
  if (contenu.edito?.texte) {
    blocks.push({
      id: generateBlockId(),
      type: 'edito',
      content: {
        text: contenu.edito.texte,
        author: 'La Rédaction ANSUT',
        genereParIa: contenu.edito.genere_par_ia
      },
      style: {
        backgroundColor: '#ffffff',
        padding: '24px',
        borderColor: '#e65100'
      },
      order: order++
    });
  }

  // Articles essentiels
  if (contenu.essentiel_ansut?.length) {
    contenu.essentiel_ansut.forEach((item, index) => {
      blocks.push({
        id: generateBlockId(),
        type: 'article',
        content: {
          title: item.titre,
          pourquoi: item.pourquoi,
          impact: item.impact,
          imageUrl: item.image_url || '',
          imageAlt: item.image_alt || '',
          actualiteId: item.actualite_id || '',
          index: index + 1
        },
        style: {
          backgroundColor: '#fff8f0',
          padding: '20px',
          borderRadius: '12px',
          borderColor: '#e65100'
        },
        order: order++
      });
    });
  }

  // Tendance Tech
  if (contenu.tendance_tech?.titre) {
    blocks.push({
      id: generateBlockId(),
      type: 'tech',
      content: {
        title: contenu.tendance_tech.titre,
        content: contenu.tendance_tech.contenu,
        lienAnsut: contenu.tendance_tech.lien_ansut,
        imageUrl: contenu.tendance_tech.image_url || '',
        imageAlt: contenu.tendance_tech.image_alt || ''
      },
      style: {
        backgroundColor: '#e3f2fd',
        padding: '24px',
        borderRadius: '12px'
      },
      order: order++
    });
  }

  // Décryptage
  if (contenu.decryptage?.titre) {
    blocks.push({
      id: generateBlockId(),
      type: 'text',
      content: {
        sectionType: 'decryptage',
        title: contenu.decryptage.titre,
        text: contenu.decryptage.contenu
      },
      style: {
        backgroundColor: '#fffde7',
        padding: '24px',
        borderRadius: '12px'
      },
      order: order++
    });
  }

  // Chiffre marquant
  if (contenu.chiffre_marquant?.valeur) {
    blocks.push({
      id: generateBlockId(),
      type: 'chiffre',
      content: {
        valeur: contenu.chiffre_marquant.valeur,
        unite: contenu.chiffre_marquant.unite,
        contexte: contenu.chiffre_marquant.contexte
      },
      style: {
        backgroundColor: '#1a237e',
        textColor: '#ffffff',
        padding: '48px',
        textAlign: 'center'
      },
      order: order++
    });
  }

  // À venir / Agenda
  if (contenu.a_venir?.length) {
    blocks.push({
      id: generateBlockId(),
      type: 'agenda',
      content: {
        items: JSON.stringify(contenu.a_venir)
      },
      style: {
        backgroundColor: '#f3e5f5',
        padding: '24px',
        borderRadius: '12px'
      },
      order: order++
    });
  }

  // Footer
  blocks.push({
    id: generateBlockId(),
    type: 'footer',
    content: {
      address: 'ANSUT - Plateau, Abidjan, Côte d\'Ivoire',
      email: 'contact@ansut.ci',
      unsubscribeText: 'Se désabonner'
    },
    style: {
      backgroundColor: '#f5f5f5',
      textColor: '#666666',
      padding: '32px',
      textAlign: 'center'
    },
    order: order++
  });

  const isAnsutRadar = newsletter.template === 'ansut_radar';

  return {
    blocks,
    globalStyles: {
      primaryColor: isAnsutRadar ? '#0f172a' : '#1a237e',
      secondaryColor: isAnsutRadar ? '#64748b' : '#283593',
      accentColor: '#e65100',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '680px',
      backgroundColor: '#ffffff'
    },
    metadata: {
      newsletterId: newsletter.id,
      template: newsletter.template || 'innovactu',
      numero: newsletter.numero,
      dateDebut: newsletter.date_debut,
      dateFin: newsletter.date_fin
    }
  };
}

/**
 * Reconvertit un document éditable en contenu JSON pour la base de données
 */
export function documentToContenu(document: NewsletterDocument): NewsletterContenu {
  const contenu: NewsletterContenu = {
    header: undefined,
    edito: { texte: '', genere_par_ia: false },
    essentiel_ansut: [],
    tendance_tech: { titre: '', contenu: '', lien_ansut: '' },
    decryptage: { titre: '', contenu: '' },
    chiffre_marquant: { valeur: '', unite: '', contexte: '' },
    a_venir: []
  };

  // Trier les blocs par ordre
  const sortedBlocks = [...document.blocks].sort((a, b) => a.order - b.order);

  for (const block of sortedBlocks) {
    switch (block.type) {
      case 'header':
        if (block.content.headerImageUrl) {
          contenu.header = {
            image_url: block.content.headerImageUrl as string,
            image_alt: (block.content.headerImageAlt as string) || ''
          };
        }
        break;

      case 'edito':
        contenu.edito = {
          texte: (block.content.text as string) || '',
          genere_par_ia: (block.content.genereParIa as boolean) || false
        };
        break;

      case 'article':
        contenu.essentiel_ansut.push({
          titre: (block.content.title as string) || '',
          pourquoi: (block.content.pourquoi as string) || '',
          impact: (block.content.impact as string) || '',
          image_url: (block.content.imageUrl as string) || undefined,
          image_alt: (block.content.imageAlt as string) || undefined,
          actualite_id: (block.content.actualiteId as string) || undefined
        });
        break;

      case 'tech':
        contenu.tendance_tech = {
          titre: (block.content.title as string) || '',
          contenu: (block.content.content as string) || '',
          lien_ansut: (block.content.lienAnsut as string) || '',
          image_url: (block.content.imageUrl as string) || undefined,
          image_alt: (block.content.imageAlt as string) || undefined
        };
        break;

      case 'text':
        if (block.content.sectionType === 'decryptage') {
          contenu.decryptage = {
            titre: (block.content.title as string) || '',
            contenu: (block.content.text as string) || ''
          };
        }
        break;

      case 'chiffre':
        contenu.chiffre_marquant = {
          valeur: (block.content.valeur as string) || '',
          unite: (block.content.unite as string) || '',
          contexte: (block.content.contexte as string) || ''
        };
        break;

      case 'agenda':
        try {
          const items = JSON.parse((block.content.items as string) || '[]') as NewsletterAVenir[];
          contenu.a_venir = items;
        } catch {
          contenu.a_venir = [];
        }
        break;
    }
  }

  return contenu;
}
