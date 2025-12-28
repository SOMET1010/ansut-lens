import { Bell, Check, CheckCheck, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import { RelativeTime } from '@/components/ui/relative-time';
import { cn } from '@/lib/utils';

const NIVEAU_CONFIG = {
  critical: {
    icon: AlertCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    label: 'Critique',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    label: 'Avertissement',
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    label: 'Info',
  },
};

export function NotificationCenter() {
  const { unreadCount, recentAlerts, markAsRead, markAllAsRead } = useRealtimeAlerts();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3" />
              Tout lire
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {recentAlerts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Aucune notification
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentAlerts.map((alert) => {
                const config = NIVEAU_CONFIG[alert.niveau as keyof typeof NIVEAU_CONFIG] || NIVEAU_CONFIG.info;
                const Icon = config.icon;
                
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'p-3 hover:bg-muted/50 transition-colors cursor-pointer',
                      !alert.lue && 'bg-muted/30'
                    )}
                    onClick={() => !alert.lue && markAsRead(alert.id)}
                  >
                    <div className="flex gap-3">
                      <div className={cn('p-1.5 rounded-full shrink-0', config.bg)}>
                        <Icon className={cn('h-3.5 w-3.5', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-sm font-medium truncate',
                            !alert.lue && 'font-semibold'
                          )}>
                            {alert.titre}
                          </p>
                          {!alert.lue && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                        {alert.message && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {alert.message}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded', config.bg, config.color)}>
                            {config.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            <RelativeTime date={alert.created_at} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <Separator />
        <div className="p-2">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            Voir toutes les alertes
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
