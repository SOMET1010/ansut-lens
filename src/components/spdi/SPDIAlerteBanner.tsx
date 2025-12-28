import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, TrendingDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SPDIAlerteBannerProps {
  variation: number;
  periode?: string;
  onAction?: () => void;
}

export function SPDIAlerteBanner({ variation, periode = '14 jours', onAction }: SPDIAlerteBannerProps) {
  // N'affiche l'alerte que si la baisse est significative (>15%)
  if (variation >= -15) return null;

  const severity = variation <= -30 ? 'critical' : 'warning';

  return (
    <Alert 
      variant="destructive" 
      className={cn(
        'border-2',
        severity === 'critical' && 'bg-red-500/10 border-red-500'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          severity === 'critical' ? 'bg-red-500/20' : 'bg-orange-500/20'
        )}>
          {severity === 'critical' ? (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-orange-500" />
          )}
        </div>
        
        <div className="flex-1">
          <AlertTitle className="text-base font-semibold mb-1">
            {severity === 'critical' 
              ? 'Alerte critique : Chute de visibilité'
              : 'Attention : Baisse significative du score'
            }
          </AlertTitle>
          <AlertDescription className="text-sm">
            Votre score de présence digitale a diminué de{' '}
            <span className="font-bold text-red-500">{Math.abs(variation).toFixed(1)}%</span>
            {' '}sur les {periode}. 
            {severity === 'critical' 
              ? ' Une action immédiate est recommandée pour rétablir votre visibilité institutionnelle.'
              : ' Consultez les recommandations pour améliorer votre présence.'
            }
          </AlertDescription>
          
          {onAction && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 gap-2"
              onClick={onAction}
            >
              Voir les recommandations
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}
