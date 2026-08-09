import { HelpCircle, LogOut, User } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials } from '@/utils/activity-status';
import { ADMIN_SECTION, NAV_GROUPS, NAV_SECTIONS } from '@/config/navigation';
import logoMark from '@/assets/logo-ansut-mark.png';

/**
 * Barre laterale de navigation.
 *
 * La refonte apporte trois changements par rapport a la version precedente.
 *
 * Le libelle de chaque entree repond desormais a une question metier plutot
 * qu'a un nom de module : « Veille » au lieu de « Capteurs Strategiques »,
 * « Recherche » au lieu de « Balayage 30 jours ». La question complete est
 * affichee en sous-titre, ce qui supprime le besoin de deviner.
 *
 * La liste des entrees provient du registre central `src/config/navigation.ts`,
 * partage avec le fil d'Ariane, la recherche globale et la navigation mobile.
 *
 * Une entree d'aide permanente donne acces au glossaire, absent auparavant.
 */
export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { signOut, user } = useAuth();
  const { profile } = useUserProfile();
  const { hasPermission, isLoading: permissionsLoading } = useUserPermissions();
  const collapsed = state === 'collapsed';

  const visibleSections = NAV_SECTIONS.filter(
    (section) => !section.hidden && hasPermission(section.permission),
  );
  const hasAdminAccess = hasPermission(ADMIN_SECTION.permission);

  const getSidebarInitials = (name?: string | null, email?: string) => {
    if (name) return getInitials(name);
    if (email) return email[0].toUpperCase();
    return '?';
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="p-4">
        <NavLink
          to="/ce-matin"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img src={logoMark} alt="" aria-hidden className="h-9 w-9 shrink-0 object-contain" />
          {!collapsed && (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-bold text-primary">ANSUT</span>
              <span className="truncate text-xs tracking-wide text-muted-foreground">RADAR</span>
            </span>
          )}
          <span className="sr-only">ANSUT Radar, retour à l’accueil</span>
        </NavLink>

        {/* Repère d'édition : rappelle qu'on consulte l'édition du jour, pas une
            application statique. Date réelle (aucune heure fabriquée). */}
        {!collapsed && (
          <div className="mt-3 rounded-md bg-muted/40 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Édition
            </p>
            <p className="text-xs font-medium capitalize text-foreground/80">
              {format(new Date(), 'EEEE d MMMM', { locale: fr })}
            </p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {permissionsLoading ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: 5 }).map((_, index) => (
                  <SidebarMenuItem key={index}>
                    <div className="flex items-center gap-3 px-3 py-2">
                      <Skeleton className="h-5 w-5 rounded" />
                      {!collapsed && <Skeleton className="h-4 w-28" />}
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          NAV_GROUPS.map((groupe) => {
            const sections = visibleSections.filter(
              (section) => (section.group ?? 'redaction') === groupe.id,
            );
            if (sections.length === 0) return null;
            return (
              <SidebarGroup key={groupe.id}>
                {!collapsed && (
                  <SidebarGroupLabel className="text-xs text-muted-foreground">
                    {groupe.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {sections.map((section) => (
                      <div key={section.id}>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive(section.path)}
                            tooltip={`${section.label} — ${section.question}`}
                            className="h-auto py-2"
                          >
                            <NavLink to={section.path} className="flex items-start gap-3">
                              <section.icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                              {!collapsed && (
                                <span className="flex min-w-0 flex-col gap-0.5 leading-tight">
                                  <span className="truncate text-sm font-medium">{section.label}</span>
                                  <span className="truncate text-[11px] text-muted-foreground">
                                    {section.question}
                                  </span>
                                </span>
                              )}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {/* « Ce matin » = porte d'entrée : séparée du reste du flux. */}
                        {section.id === 'ce-matin' && <SidebarSeparator className="my-2" />}
                      </div>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })
        )}

        {!permissionsLoading && hasAdminAccess && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarGroup className="rounded-lg bg-muted/30">
              {!collapsed && (
                <SidebarGroupLabel className="text-xs text-muted-foreground">
                  Administration
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(ADMIN_SECTION.path)}
                      tooltip={`${ADMIN_SECTION.label} — ${ADMIN_SECTION.question}`}
                    >
                      <NavLink to={ADMIN_SECTION.path} className="flex items-center gap-3">
                        <ADMIN_SECTION.icon className="h-5 w-5 shrink-0" aria-hidden />
                        {!collapsed && <span className="text-sm">{ADMIN_SECTION.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarSeparator className="my-2" />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/aide')}
                  tooltip="Aide et glossaire des termes"
                >
                  <NavLink to="/aide" className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 shrink-0" aria-hidden />
                    {!collapsed && <span className="text-sm">Aide et glossaire</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {user && (
          <div className="flex flex-col gap-2">
            <NavLink
              to="/profile"
              className="flex min-h-11 items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage
                  src={profile?.avatar_url || undefined}
                  alt={profile?.full_name || 'Avatar'}
                />
                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                  {getSidebarInitials(profile?.full_name, user.email)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">
                    {profile?.full_name || user.email}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" aria-hidden />
                    Mon profil
                  </span>
                </span>
              )}
            </NavLink>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="min-h-11 justify-start gap-2">
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                  {!collapsed && <span>Déconnexion</span>}
                  {collapsed && <span className="sr-only">Déconnexion</span>}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la déconnexion ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Vous serez déconnecté de votre session. Vous devrez vous reconnecter
                    pour accéder à nouveau à la plateforme.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={signOut}>Se déconnecter</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
