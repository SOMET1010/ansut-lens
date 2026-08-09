import { useState } from 'react';
import { HelpCircle, LogOut, Moon, Search, Sun, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useTheme } from 'next-themes';
import { NotificationCenter } from '@/components/notifications';
import { SpotlightSearch } from './SpotlightSearch';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getInitials } from '@/utils/activity-status';

/**
 * En-tete de l'application.
 *
 * Trois corrections issues de l'audit sont appliquees ici.
 *
 * Le fil d'Ariane remplace l'ancien vide informationnel : l'utilisateur sait en
 * permanence dans quelle section il se trouve et peut remonter d'un niveau.
 *
 * Le logo, qui apparaissait a la fois dans la barre laterale et dans l'en-tete,
 * n'est plus duplique ici. Il ne subsiste que dans la barre laterale.
 *
 * La recherche globale reste accessible par raccourci clavier mais devient
 * egalement un bouton visible et libelle, y compris sur mobile ou elle n'etait
 * pas atteignable.
 */
export function AppHeader() {
  const { theme, setTheme } = useTheme();
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const headerInitials = profile?.full_name
    ? getInitials(profile.full_name)
    : (user?.email?.[0]?.toUpperCase() ?? '?');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <SidebarTrigger className="-ml-1 hidden md:inline-flex" />

        <Breadcrumbs />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Recherche : bouton libelle sur grand ecran, icone sur mobile. */}
          <button
            onClick={() => setSpotlightOpen(true)}
            className="hidden min-h-9 items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex lg:w-64"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1 text-left">Rechercher…</span>
            <kbd className="inline-flex h-5 items-center rounded border border-border bg-background px-1.5 font-mono text-xs font-medium">
              ⌘K
            </kbd>
          </button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 lg:hidden"
                onClick={() => setSpotlightOpen(true)}
                aria-label="Rechercher dans la plateforme"
              >
                <Search className="h-5 w-5" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rechercher</TooltipContent>
          </Tooltip>

          <SpotlightSearch open={spotlightOpen} onOpenChange={setSpotlightOpen} />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-9 sm:w-9" asChild aria-label="Afficher l'aide">
                <NavLink to="/aide" aria-label="Aide et glossaire des termes">
                  <HelpCircle className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
                </NavLink>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Aide et glossaire</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 sm:h-9 sm:w-9"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
                ) : (
                  <Moon className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            </TooltipContent>
          </Tooltip>

          <NotificationCenter />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-full p-0 sm:h-9 sm:w-9"
                  aria-label="Mon compte"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={profile?.avatar_url || undefined}
                      alt={profile?.full_name || 'Avatar'}
                    />
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      {headerInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">
                    {profile?.full_name || user.email}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink to="/profile" className="flex cursor-pointer items-center gap-2">
                    <User className="h-4 w-4" aria-hidden />
                    Mon profil
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <NavLink to="/aide" className="flex cursor-pointer items-center gap-2">
                    <HelpCircle className="h-4 w-4" aria-hidden />
                    Aide et glossaire
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setConfirmLogoutOpen(true)}
                  className="cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" aria-hidden />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <AlertDialog open={confirmLogoutOpen} onOpenChange={setConfirmLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la déconnexion ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous serez déconnecté de votre session. Vous devrez vous reconnecter pour
              accéder à nouveau à la plateforme.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={signOut}>Se déconnecter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
