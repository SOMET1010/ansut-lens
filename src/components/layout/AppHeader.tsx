import { Bell, Search, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useTheme } from 'next-themes';
import type { ViewMode } from '@/types';

const modeLabels: Record<ViewMode, string> = {
  dg: 'DG',
  analyste: 'Analyste',
  crise: 'Crise',
};

const modeColors: Record<ViewMode, string> = {
  dg: 'bg-primary text-primary-foreground',
  analyste: 'bg-secondary text-secondary-foreground',
  crise: 'bg-destructive text-destructive-foreground',
};

export function AppHeader() {
  const { mode, setMode } = useViewMode();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4">
        <SidebarTrigger className="-ml-1" />

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {(Object.keys(modeLabels) as ViewMode[]).map((m) => (
            <Button
              key={m}
              variant={mode === m ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode(m)}
              className={`h-7 px-3 text-xs font-medium ${
                mode === m ? modeColors[m] : ''
              }`}
            >
              {modeLabels[m]}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher..."
              className="pl-9 bg-muted/50 border-border/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Sync Status */}
          <Badge variant="outline" className="gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-signal-positive animate-pulse" />
            Sync OK
          </Badge>

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              3
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
