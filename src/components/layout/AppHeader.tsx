import { useState } from 'react';
import { Search, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useTheme } from 'next-themes';
import { NotificationCenter } from '@/components/notifications';
import { SpotlightSearch } from './SpotlightSearch';
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
  const [spotlightOpen, setSpotlightOpen] = useState(false);

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

        {/* Search Trigger */}
        <button
          onClick={() => setSpotlightOpen(true)}
          className="flex-1 max-w-md flex items-center gap-2 rounded-md border border-border/50 bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Rechercher…</span>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        <SpotlightSearch open={spotlightOpen} onOpenChange={setSpotlightOpen} />

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
          <NotificationCenter />
        </div>
      </div>
    </header>
  );
}
