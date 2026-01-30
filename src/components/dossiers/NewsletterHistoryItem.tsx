import { Send, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Newsletter } from '@/types/newsletter';

interface NewsletterHistoryItemProps {
  newsletter: Newsletter;
  onClick?: () => void;
}

export function NewsletterHistoryItem({ newsletter, onClick }: NewsletterHistoryItemProps) {
  const date = new Date(newsletter.date_envoi || newsletter.created_at || new Date());
  const title = newsletter.contenu?.edito?.texte?.slice(0, 40) || `Newsletter #${newsletter.numero}`;
  
  // Simulated open rate (would come from email analytics in production)
  const openRate = Math.floor(60 + Math.random() * 25);

  const isEnvoye = newsletter.statut === 'envoye';

  return (
    <div 
      className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Date badge */}
      <div className="flex flex-col items-center justify-center h-12 w-12 bg-primary/10 text-primary rounded-lg shrink-0">
        <span className="text-[10px] font-bold uppercase">
          {format(date, 'MMM', { locale: fr })}
        </span>
        <span className="text-lg font-bold leading-none">
          {format(date, 'dd')}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
          {title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          {isEnvoye ? (
            <Badge 
              variant="outline" 
              className="text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 border-0 text-[10px]"
            >
              <Send className="h-3 w-3 mr-1" />
              Envoyé • {openRate}% ouv.
            </Badge>
          ) : (
            <Badge 
              variant="outline" 
              className="text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400 border-0 text-[10px]"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Brouillon
            </Badge>
          )}
        </div>
      </div>

      {/* Action */}
      <Button 
        variant="ghost" 
        size="icon"
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      >
        <Edit3 className="h-4 w-4" />
      </Button>
    </div>
  );
}
