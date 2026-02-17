import { AlertTriangle } from 'lucide-react';

interface DangerZoneAlertProps {
  title?: string;
  description: string;
  children?: React.ReactNode;
}

export function DangerZoneAlert({ 
  title = 'Zone sensible', 
  description, 
  children 
}: DangerZoneAlertProps) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-destructive">{title}</h4>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {children && <div className="pl-8">{children}</div>}
    </div>
  );
}
