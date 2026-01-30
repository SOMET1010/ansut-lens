import { ExternalLink, Bookmark, Share2, Globe, Clock, Zap } from 'lucide-react';
import { RelativeTime } from '@/components/ui/relative-time';
import { cn } from '@/lib/utils';
import { Actualite } from '@/types';

interface IntelligenceCardProps {
  actualite: Actualite;
  onOpenSource?: (url: string) => void;
  onSave?: (actualite: Actualite) => void;
  onShare?: (actualite: Actualite) => void;
}

type SentimentType = 'negative' | 'positive' | 'neutral' | 'weak-signal';

const getSentimentType = (actualite: Actualite): SentimentType => {
  // Check for weak signal in tags
  const weakSignalTags = ['signal-faible', 'signal faible', 'emerging', 'trend'];
  const hasWeakSignalTag = actualite.tags?.some(t => 
    weakSignalTags.some(wt => t.toLowerCase().includes(wt))
  );
  if (hasWeakSignalTag) return 'weak-signal';

  // Check explicit sentiment
  if (actualite.sentiment !== undefined && actualite.sentiment !== null) {
    if (actualite.sentiment < -0.3) return 'negative';
    if (actualite.sentiment > 0.3) return 'positive';
  }
  
  // Check tags for alert indicators
  const alertTags = ['risque', 'alerte', 'menace', 'problème', 'crise', 'critique', 'urgent'];
  const hasAlertTag = actualite.tags?.some(t => 
    alertTags.some(at => t.toLowerCase().includes(at))
  );
  if (hasAlertTag) return 'negative';
  
  // Check tags for positive indicators
  const positiveTags = ['opportunité', 'innovation', 'financement', 'partenariat', 'succès'];
  const hasPositiveTag = actualite.tags?.some(t => 
    positiveTags.some(pt => t.toLowerCase().includes(pt))
  );
  if (hasPositiveTag) return 'positive';
  
  return 'neutral';
};

const sentimentStyles: Record<SentimentType, { border: string; badge?: string; badgeLabel?: string; icon?: React.ReactNode }> = {
  negative: {
    border: 'border-l-4 border-l-signal-critical',
    badge: 'bg-signal-critical/10 text-signal-critical',
    badgeLabel: 'Alerte',
  },
  positive: {
    border: 'border-l-4 border-l-signal-positive',
    badge: 'bg-signal-positive/10 text-signal-positive',
    badgeLabel: 'Opportunité',
  },
  'weak-signal': {
    border: 'border-l-4 border-l-chart-5',
    badge: 'bg-chart-5/10 text-chart-5',
    badgeLabel: 'Signal Faible',
    icon: <Zap size={10} />,
  },
  neutral: {
    border: 'border-l-4 border-l-primary',
  },
};

export function IntelligenceCard({ actualite, onOpenSource, onSave, onShare }: IntelligenceCardProps) {
  const sentimentType = getSentimentType(actualite);
  const style = sentimentStyles[sentimentType];
  
  const summary = actualite.resume || actualite.pourquoi_important || actualite.contenu?.substring(0, 200);

  return (
    <div 
      className={cn(
        "flex bg-card border-b border-border p-5 hover:bg-muted/30 transition-colors group",
        style.border
      )}
    >
      <div className="flex-1 min-w-0">
        {/* Metadata row */}
        <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <Globe size={12} className="text-muted-foreground" />
            {actualite.source_nom || 'Source inconnue'}
          </span>
          
          <span className="text-muted-foreground/50">•</span>
          
          {actualite.date_publication && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              <RelativeTime date={actualite.date_publication} />
            </span>
          )}
          
          {style.badge && style.badgeLabel && (
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
              style.badge
            )}>
              {style.icon}
              {style.badgeLabel}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 
          className="text-base font-bold text-foreground mb-2 group-hover:text-primary cursor-pointer leading-tight"
          onClick={() => actualite.source_url && onOpenSource?.(actualite.source_url)}
        >
          {actualite.titre}
        </h3>

        {/* Summary */}
        {summary && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3 max-w-3xl">
            {summary}
          </p>
        )}

        {/* Tags */}
        {actualite.tags && actualite.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {actualite.tags.slice(0, 4).map((tag, i) => (
              <span 
                key={i} 
                className="text-xs font-medium px-2 py-0.5 bg-muted text-muted-foreground rounded border border-border"
              >
                #{tag}
              </span>
            ))}
            {actualite.tags.length > 4 && (
              <span className="text-xs text-muted-foreground">
                +{actualite.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action buttons (visible on hover) */}
      <div className="flex flex-col gap-1.5 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {actualite.source_url && (
          <button 
            title="Lire la source"
            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
            onClick={() => onOpenSource?.(actualite.source_url!)}
          >
            <ExternalLink size={16} />
          </button>
        )}
        <button 
          title="Sauvegarder"
          className="p-2 text-muted-foreground hover:text-secondary hover:bg-secondary/10 rounded-md transition-colors"
          onClick={() => onSave?.(actualite)}
        >
          <Bookmark size={16} />
        </button>
        <button 
          title="Partager"
          className="p-2 text-muted-foreground hover:text-signal-positive hover:bg-signal-positive/10 rounded-md transition-colors"
          onClick={() => onShare?.(actualite)}
        >
          <Share2 size={16} />
        </button>
      </div>
    </div>
  );
}
