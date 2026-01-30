import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MessageContent } from './MessageContent';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

// Extract source names from citations in content
function extractSourceNames(content: string): string[] {
  const sourceMatches = content.match(/\[\[(ACTU|DOSSIER):[^|]+\|([^\]]+)\]\]/g) || [];
  return sourceMatches.map(m => {
    const match = m.match(/\[\[(ACTU|DOSSIER):[^|]+\|([^\]]+)\]\]/);
    return match ? match[2] : '';
  }).filter(Boolean);
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isAssistant = role === 'assistant';
  const sources = isAssistant ? extractSourceNames(content) : [];
  
  // Remove duplicates from sources
  const uniqueSources = [...new Set(sources)];
  
  return (
    <div className={cn(
      "flex gap-4 mb-6",
      !isAssistant && "flex-row-reverse"
    )}>
      {/* Avatar */}
      <div className={cn(
        "shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-sm",
        isAssistant 
          ? "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground" 
          : "bg-secondary text-secondary-foreground"
      )}>
        {isAssistant ? (
          <Bot className="h-5 w-5" />
        ) : (
          <span className="font-bold text-xs">VOUS</span>
        )}
      </div>
      
      {/* Content */}
      <div className={cn(
        "max-w-[85%] rounded-2xl p-5 shadow-sm border",
        isAssistant 
          ? "bg-card border-border rounded-tl-none" 
          : "bg-primary/10 border-primary/20 rounded-tr-none"
      )}>
        <div className="prose prose-sm text-foreground leading-relaxed">
          {isAssistant ? (
            <MessageContent content={content} />
          ) : (
            <span className="whitespace-pre-wrap">{content}</span>
          )}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
          )}
        </div>
        
        {/* Sources Block */}
        {isAssistant && uniqueSources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-dashed border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
              Sources analysées :
            </p>
            <div className="flex flex-wrap gap-2">
              {uniqueSources.slice(0, 5).map((src, i) => (
                <Badge 
                  key={i} 
                  variant="outline" 
                  className="text-xs bg-background/50"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5" />
                  <span className="max-w-[120px] truncate">{src}</span>
                </Badge>
              ))}
              {uniqueSources.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{uniqueSources.length - 5} autres
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
