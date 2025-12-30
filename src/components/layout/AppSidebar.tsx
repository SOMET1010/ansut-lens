import { 
  LayoutDashboard, 
  Newspaper, 
  Users, 
  FileText,
  Bot, 
  Settings,
  LogOut,
  User,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import logoAnsut from '@/assets/logo-ansut.jpg';

// Menu à 6 entrées maximum (+ admin conditionnel)
const menuItems = [
  { 
    title: 'Tableau de bord', 
    url: '/radar', 
    icon: LayoutDashboard,
    description: 'Vue exécutive'
  },
  { 
    title: 'Actualités & Veille', 
    url: '/actualites', 
    icon: Newspaper,
    description: 'Revue de presse'
  },
  { 
    title: 'Acteurs clés', 
    url: '/personnalites', 
    icon: Users,
    description: 'Fiches personnalités'
  },
  { 
    title: 'Dossiers stratégiques', 
    url: '/dossiers', 
    icon: FileText,
    description: 'Notes et briefings'
  },
  { 
    title: 'Assistant IA', 
    url: '/assistant', 
    icon: Bot,
    description: 'Copilote intelligence'
  },
];

const adminItem = { 
  title: 'Administration', 
  url: '/admin', 
  icon: Settings,
  description: 'Configuration'
};

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { isAdmin, signOut, user } = useAuth();
  const { profile } = useUserProfile();
  const collapsed = state === 'collapsed';

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
              ))}

              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(adminItem.url)}
                    tooltip={adminItem.title}
                  >
                    <NavLink to={adminItem.url} className="flex items-center gap-3">
                      <adminItem.icon className="h-5 w-5" />
                      {!collapsed && <span>{adminItem.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
                  {getInitials(profile?.full_name, user.email)}
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
