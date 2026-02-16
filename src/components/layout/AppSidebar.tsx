import { 
  Radar,
  Newspaper, 
  Users, 
  FileText,
  Bot, 
  Settings,
  LogOut,
  User,
  Rss,
  Activity,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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
import logoAnsut from '@/assets/logo-ansut.jpg';

// Menu avec permissions associées
const menuItems = [
  { 
    title: 'Centre de Veille', 
    url: '/radar', 
    icon: Radar,
    description: 'Flux d\'intelligence',
    permission: 'view_radar'
  },
  { 
    title: 'Actualités & Veille', 
    url: '/actualites', 
    icon: Newspaper,
    description: 'Revue de presse',
    permission: 'view_actualites'
  },
  { 
    title: 'Mes Flux', 
    url: '/flux', 
    icon: Rss,
    description: 'Flux personnalisés',
    permission: 'create_flux'
  },
  { 
    title: 'Acteurs clés', 
    url: '/personnalites', 
    icon: Users,
    description: 'Fiches personnalités',
    permission: 'view_personnalites'
  },
  { 
    title: 'Présence Digitale', 
    url: '/presence-digitale', 
    icon: Activity,
    description: 'Score SPDI & analyses',
    permission: 'view_personnalites'
  },
  { 
    title: 'Studio Publication', 
    url: '/dossiers', 
    icon: FileText,
    description: 'Notes et newsletters',
    permission: 'view_dossiers'
  },
  { 
    title: 'Assistant IA', 
    url: '/assistant', 
    icon: Bot,
    description: 'Copilote intelligence',
    permission: 'use_assistant'
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { isAdmin, signOut, user } = useAuth();
  const { profile } = useUserProfile();
  const { hasPermission, isLoading: permissionsLoading } = useUserPermissions();
  const collapsed = state === 'collapsed';
  
  // Filtrer les éléments de menu selon les permissions
  const visibleMenuItems = menuItems.filter(item => hasPermission(item.permission));
  
  // Vérifier si l'utilisateur a accès à l'administration
  const hasAdminAccess = isAdmin || hasPermission('manage_users') || hasPermission('manage_roles');

  const getSidebarInitials = (name?: string | null, email?: string) => {
    if (name) return getInitials(name);
    if (email) return email[0].toUpperCase();
    return '?';
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img 
            src={logoAnsut} 
            alt="ANSUT" 
            className="w-10 h-10 rounded-lg object-contain bg-white"
          />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-primary">ANSUT</span>
              <span className="text-xs text-muted-foreground">RADAR</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Menu fonctionnel - filtré par permissions */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {permissionsLoading ? (
                // Skeletons pendant le chargement
                [...Array(4)].map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <div className="flex items-center gap-3 px-3 py-2">
                      <Skeleton className="h-5 w-5 rounded" />
                      {!collapsed && <Skeleton className="h-4 w-24" />}
                    </div>
                  </SidebarMenuItem>
                ))
              ) : (
                visibleMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Section Administration - visible si permissions admin */}
        {!permissionsLoading && hasAdminAccess && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarGroup>
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
                      isActive={isActive('/admin')}
                      tooltip="Administration"
                    >
                      <NavLink to="/admin" className="flex items-center gap-3">
                        <Settings className="h-5 w-5" />
                        {!collapsed && <span>Administration</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {user && (
          <div className="flex flex-col gap-3">
            <NavLink 
              to="/profile" 
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'Avatar'} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getSidebarInitials(profile?.full_name, user.email)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {profile?.full_name || user.email}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Mon profil
                  </span>
                </div>
              )}
            </NavLink>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut}
              className="justify-start gap-2"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Déconnexion</span>}
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
