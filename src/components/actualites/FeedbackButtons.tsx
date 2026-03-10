import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThumbsUp, ThumbsDown, Star, Archive } from 'lucide-react';
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
            pertinent: '👍 Marqué comme pertinent',
            non_pertinent: '👎 Marqué non pertinent — RADAR apprend',
            important: '⭐ Marqué important',
            archive: '📁 Archivé',
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
            className={cn(btnSize, currentFeedback === 'pertinent' && 'text-emerald-500 bg-emerald-500/10')}
            onClick={(e) => { e.stopPropagation(); handleFeedback('pertinent'); }}
            disabled={submitFeedback.isPending}
          >
            <ThumbsUp className={size} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Pertinent pour moi</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(btnSize, currentFeedback === 'non_pertinent' && 'text-red-500 bg-red-500/10')}
            onClick={(e) => { e.stopPropagation(); handleFeedback('non_pertinent'); }}
            disabled={submitFeedback.isPending}
          >
            <ThumbsDown className={size} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Non pertinent — RADAR apprend</TooltipContent>
      </Tooltip>

      {!compact && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(btnSize, currentFeedback === 'important' && 'text-amber-500 bg-amber-500/10')}
                onClick={(e) => { e.stopPropagation(); handleFeedback('important'); }}
                disabled={submitFeedback.isPending}
              >
                <Star className={size} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Important</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(btnSize, currentFeedback === 'archive' && 'text-muted-foreground bg-muted')}
                onClick={(e) => { e.stopPropagation(); handleFeedback('archive'); }}
                disabled={submitFeedback.isPending}
              >
                <Archive className={size} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archiver</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
