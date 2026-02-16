import { Linkedin, Newspaper, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PresenceCanauxProps {
  linkedin: number;
  presse: number;
  conferences: number;
  className?: string;
}

const channels = [
  { key: 'linkedin' as const, label: 'LinkedIn', Icon: Linkedin },
  { key: 'presse' as const, label: 'Presse', Icon: Newspaper },
  { key: 'conferences' as const, label: 'Conf.', Icon: Mic },
];

export function PresenceCanaux({ linkedin, presse, conferences, className }: PresenceCanauxProps) {
  const values = { linkedin, presse, conferences };

  return (
    <div className={cn('space-y-2', className)}>
      {channels.map(({ key, label, Icon }) => (
        <div key={key} className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] font-medium text-muted-foreground w-14 shrink-0">{label}</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${values[key]}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-foreground w-7 text-right">{values[key]}</span>
        </div>
      ))}
    </div>
  );
}
