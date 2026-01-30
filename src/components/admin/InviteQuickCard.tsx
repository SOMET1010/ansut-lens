import { UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface InviteQuickCardProps {
  onClick: () => void;
  className?: string;
}

export function InviteQuickCard({ onClick, className }: InviteQuickCardProps) {
  return (
    <Card 
      className={cn(
        "border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-all cursor-pointer group",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 flex flex-col items-center justify-center min-h-[180px] text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-medium text-sm mb-1">Ajouter un collaborateur</h3>
        <p className="text-xs text-muted-foreground">
          Envoyez une invitation par email
        </p>
      </CardContent>
    </Card>
  );
}
