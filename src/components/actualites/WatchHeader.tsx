import { Calendar, Download, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WatchHeaderProps {
  newArticlesCount: number;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  onRefresh: () => void;
  onExport?: () => void;
  isRefreshing?: boolean;
}

const periodLabels: Record<string, string> = {
  '24h': "Aujourd'hui",
  '72h': '3 derniers jours',
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  'all': 'Tout'
};

export function WatchHeader({
  newArticlesCount,
  selectedPeriod,
  onPeriodChange,
  onRefresh,
  onExport,
  isRefreshing
}: WatchHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Actualités & Veille</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {newArticlesCount > 0 
            ? `${newArticlesCount} article${newArticlesCount > 1 ? 's' : ''} collecté${newArticlesCount > 1 ? 's' : ''}`
            : 'Aucun nouvel article'
          }
        </p>
      </div>

      <div className="flex gap-3 w-full md:w-auto flex-wrap">
        {/* Sélecteur de période */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{periodLabels[selectedPeriod] || "Aujourd'hui"}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.entries(periodLabels).map(([value, label]) => (
              <DropdownMenuItem 
                key={value}
                onClick={() => onPeriodChange(value)}
                className={selectedPeriod === value ? 'bg-accent' : ''}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bouton Rafraîchir */}
        <Button 
          variant="outline" 
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>

        {/* Bouton Export */}
        {onExport && (
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        )}
      </div>
    </div>
  );
}
