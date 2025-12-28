import { 
  Target, 
  Newspaper, 
  BarChart3, 
  Users, 
  Bot, 
  Settings,
  LogOut,
  Activity
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
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

const menuItems = [
  { 
    title: 'Centre Radar', 
    url: '/radar', 
    icon: Target,
    description: 'Tableau de bord'
  },
  { 
    title: 'Actualités', 
    url: '/actualites', 
    icon: Newspaper,
    description: 'Veille du jour'
  },
  { 
    title: 'Médias ANSUT', 
    url: '/medias', 
    icon: BarChart3,
    description: 'E-réputation'
  },
  { 
    title: 'Personnalités', 
    url: '/personnalites', 
    icon: Users,
    description: 'Suivi influenceurs'
  },
  { 
    title: 'Présence Digitale', 
    url: '/presence-digitale', 
    icon: Activity,
    description: 'Score SPDI'
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
  const collapsed = state === 'collapsed';

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
          <div className="flex flex-col gap-2">
            {!collapsed && (
              <div className="text-xs text-muted-foreground truncate">
                {user.email}
              </div>
            )}
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
