import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThumbsUp, ThumbsDown, Star, Archive, MoreHorizontal, Check } from 'lucide-react';
import { useActualiteFeedback, useMyFeedback } from '@/hooks/useUserIntelligence';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FeedbackButtonsProps {
  actualiteId: string;
  compact?: boolean;
}

export function FeedbackButtons({ actualiteId, compact = false }: FeedbackButtonsProps) {
  const { data: myFeedback } = useMyFeedback();
  const submitFeedback = useActualiteFeedback();
  const currentFeedback = myFeedback?.[actualiteId];

  const handleFeedback = (feedback: string) => {
    submitFeedback.mutate(
      { actualiteId, feedback },
      {
        onSuccess: () => {
          const labels: Record<string, string> = {
            pertinent: 'Marqué comme pertinent',
            non_pertinent: 'Marqué non pertinent — RADAR apprend',
            important: 'Marqué important',
            archive: 'Archivé',
          };
          toast.success(labels[feedback] || 'Feedback enregistré');
        },
      }
    );
  };

  const size = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const btnSize = compact ? 'h-7 w-7' : 'h-8 w-8';

  return (
    <div className="flex items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            // Remplacement des couleurs littérales par les tokens sémantiques
            className={cn(btnSize, currentFeedback === 'pertinent' && 'text-[hsl(var(--signal-positive))] bg-[hsl(var(--signal-positive))]/10')}
            onClick={(e) => { e.stopPropagation(); handleFeedback('pertinent'); }}
            disabled={submitFeedback.isPending} aria-label="Marquer comme pertinent">
            <ThumbsUp className={size} aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Pertinent pour moi</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            // Remplacement des couleurs littérales par les tokens sémantiques
            className={cn(btnSize, currentFeedback === 'non_pertinent' && 'text-[hsl(var(--signal-critical))] bg-[hsl(var(--signal-critical))]/10')}
            onClick={(e) => { e.stopPropagation(); handleFeedback('non_pertinent'); }}
            disabled={submitFeedback.isPending} aria-label="Marquer comme non pertinent">
            <ThumbsDown className={size} aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Non pertinent — RADAR apprend</TooltipContent>
      </Tooltip>

      {/*
        Important + Archiver. En mode plein, boutons inline. En mode compact
        (fil principal), regroupés dans un menu « ⋯ » pour ne pas encombrer la
        rangée : le chargé de veille peut prioriser et nettoyer sans ouvrir le
        détail (correctif audit UX Lot 4).
      */}
      {!compact ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                // Remplacement des couleurs littérales par les tokens sémantiques
                className={cn(btnSize, currentFeedback === 'important' && 'text-attention bg-attention/10')}
                onClick={(e) => { e.stopPropagation(); handleFeedback('important'); }}
                disabled={submitFeedback.isPending} aria-label="Marquer comme important">
                <Star className={size} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Important</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                // Remplacement des couleurs littérales par les tokens sémantiques
                className={cn(btnSize, currentFeedback === 'archive' && 'text-muted-foreground bg-muted')}
                onClick={(e) => { e.stopPropagation(); handleFeedback('archive'); }}
                disabled={submitFeedback.isPending} aria-label="Archiver">
                <Archive className={size} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archiver</TooltipContent>
          </Tooltip>
        </>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={btnSize}
              onClick={(e) => e.stopPropagation()}
              disabled={submitFeedback.isPending}
              aria-label="Plus d'actions de qualification"
            >
              <MoreHorizontal className={size} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); handleFeedback('important'); }}
              disabled={submitFeedback.isPending}
            >
              <Star className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Marquer important</span>
              {currentFeedback === 'important' && <Check className="ml-auto h-4 w-4" aria-hidden="true" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); handleFeedback('archive'); }}
              disabled={submitFeedback.isPending}
            >
              <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Archiver</span>
              {currentFeedback === 'archive' && <Check className="ml-auto h-4 w-4" aria-hidden="true" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
