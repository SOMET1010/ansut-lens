import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MessageContent } from './MessageContent';
import { extraireSources } from './citationValidite';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  /** Clés (`TYPE:id`) des citations jugées invalides par la validation edge. */
  invalidKeys?: Set<string>;
}

export function ChatMessage({ role, content, isStreaming, invalidKeys }: ChatMessageProps) {
  const isAssistant = role === 'assistant';
  // Charte : une citation hallucinée n'est PAS une « source analysée ». On ne
  // liste ici que les sources VALIDES (dédupliquées) ; les invalides restent
  // marquées « source introuvable » dans le corps du message.
  const uniqueSources = isAssistant
    ? extraireSources(content, invalidKeys).filter((s) => !s.invalide).map((s) => s.titre)
    : [];

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
            <MessageContent content={content} invalidKeys={invalidKeys} />
          ) : (
            <span className="whitespace-pre-wrap">{content}</span>
          )}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-foreground animate-pulse ml-1" />
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
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mr-1.5" />
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
