import { useEffect, useRef } from 'react';
import { ShieldAlert, AlertTriangle, Info, CheckCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RelativeTime } from '@/components/ui/relative-time';
import { useAlertNotifications } from '@/components/notifications/AlertNotificationProvider';
import { cn } from '@/lib/utils';

const LEVEL_CONFIG = {
  critical: { icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
} as const;

export function RealtimeAlertFeed() {
  const { recentAlerts, unreadCount, markAsRead, markAllAsRead } = useAlertNotifications();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [recentAlerts]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Alertes en temps réel</CardTitle>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="gap-1.5 text-xs">
            <CheckCheck className="h-3.5 w-3.5" />
            Marquer tout lu
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {recentAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune alerte récente</p>
        ) : (
          <ScrollArea className="h-[320px]" ref={scrollRef}>
            <div className="space-y-2 pr-3">
              {recentAlerts.map((alert) => {
                const level = (alert.niveau as keyof typeof LEVEL_CONFIG) || 'info';
                const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.info;
                const Icon = config.icon;

                return (
                  <button
                    key={alert.id}
                    onClick={() => !alert.lue && markAsRead(alert.id)}
                    className={cn(
                      'w-full text-left rounded-lg border p-3 transition-colors',
                      config.bg, config.border,
                      !alert.lue && 'ring-1 ring-offset-1 ring-primary/20',
                      alert.lue && 'opacity-60',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', config.color)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn('text-sm font-medium truncate', !alert.lue && 'font-semibold')}>
                            {alert.titre}
                          </span>
                          {!alert.lue && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                        </div>
                        {alert.message && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{alert.message}</p>
                        )}
                        <RelativeTime date={alert.created_at} className="text-[11px] mt-1 block" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
