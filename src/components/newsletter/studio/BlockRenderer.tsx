import type { NewsletterBlock, BlockProps, BlockStyle } from '@/types/newsletter-studio';
import { HeaderBlock } from './blocks/HeaderBlock';
import { EditoBlock } from './blocks/EditoBlock';
import { ArticleBlock } from './blocks/ArticleBlock';
import { TechBlock } from './blocks/TechBlock';
import { ChiffreBlock } from './blocks/ChiffreBlock';
import { AgendaBlock } from './blocks/AgendaBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { SeparatorBlock } from './blocks/SeparatorBlock';
import { ButtonBlock } from './blocks/ButtonBlock';
import { FooterBlock } from './blocks/FooterBlock';
import { TextBlock } from './blocks/TextBlock';

interface BlockRendererProps {
  block: NewsletterBlock;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (content: Record<string, string | number | boolean | undefined>) => void;
  onStyleUpdate: (style: Partial<BlockStyle>) => void;
}

export function BlockRenderer({ block, isSelected, onSelect, onUpdate, onStyleUpdate }: BlockRendererProps) {
  const props: BlockProps = {
    block,
    isSelected,
    onSelect,
    onUpdate,
    onStyleUpdate
  };

  switch (block.type) {
    case 'header':
      return <HeaderBlock {...props} />;
    case 'edito':
      return <EditoBlock {...props} />;
    case 'article':
      return <ArticleBlock {...props} />;
    case 'tech':
      return <TechBlock {...props} />;
    case 'chiffre':
      return <ChiffreBlock {...props} />;
    case 'agenda':
      return <AgendaBlock {...props} />;
    case 'image':
      return <ImageBlock {...props} />;
    case 'separator':
      return <SeparatorBlock {...props} />;
    case 'button':
      return <ButtonBlock {...props} />;
    case 'footer':
      return <FooterBlock {...props} />;
    case 'text':
      return <TextBlock {...props} />;
    default:
      return (
        <div 
          onClick={onSelect}
          className={`p-4 bg-muted rounded-lg ${isSelected ? 'ring-2 ring-primary' : ''}`}
        >
          <p className="text-sm text-muted-foreground">
            Bloc inconnu: {block.type}
          </p>
        </div>
      );
  }
}
