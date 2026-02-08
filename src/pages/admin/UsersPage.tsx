import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, Loader2, Mail, Shield, User, Users, ChevronDown, MoreVertical, UserX, UserCheck, Trash2, RefreshCw, Clock, Search, X, MailCheck, KeyRound, LayoutGrid, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { UserCard, SecurityKpiCards, InviteQuickCard, InvitationTracker } from '@/components/admin';
import { getActivityCategory, formatLastActivity, formatExactDate, getInitials, type ActivityCategory } from '@/utils/activity-status';

interface UserStatus {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  last_active_at: string | null;
  password_set_at?: string | null;
  created_at: string;
}

type AppRole = Database['public']['Enums']['app_role'];

const inviteSchema = z.object({
  email: z.string()
    .trim()
    .email("Format d'email invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères"),
  fullName: z.string()
    .trim()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  role: z.enum(['admin', 'user', 'council_user', 'guest'] as const),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface UserWithProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: AppRole;
  disabled: boolean;
  department: string | null;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrateur',
  user: 'Analyste',
  council_user: 'Décideur',
  guest: 'Observateur',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  user: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  council_user: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  guest: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const roleIcons: Record<AppRole, React.ReactNode> = {
  admin: <Shield className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
  council_user: <Users className="h-4 w-4" />,
  guest: <Mail className="h-4 w-4" />,
};

/* ────── Badge de statut pour la vue table ────── */
function TableActivityBadge({ category, lastActiveAt }: { category: ActivityCategory; lastActiveAt: string | null }) {
  if (category === 'disabled') {
    return (
      <Badge variant="secondary" className="bg-muted text-muted-foreground">
        Désactivé
      </Badge>
    );
  }
  if (category === 'pending') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 gap-1 cursor-help">
              <Clock className="h-3 w-3" />
              En attente
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>L'utilisateur n'a pas encore activé son compte</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (category === 'password_not_set') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 gap-1 cursor-help">
              <KeyRound className="h-3 w-3" />
              MDP non défini
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>L'utilisateur a cliqué le lien mais n'a pas encore défini son mot de passe</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (category === 'never_connected') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 gap-1 cursor-help">
              <UserX className="h-3 w-3" />
              Jamais connecté
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Cet utilisateur n'a jamais ouvert de session</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (category === 'dormant') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 gap-1 cursor-help">
              <Clock className="h-3 w-3" />
              Inactif
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Dernière connexion le {lastActiveAt ? formatExactDate(lastActiveAt) : '—'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (category === 'online') {
    return (
      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        En ligne
      </Badge>
    );
  }
  // active
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-help">
            Actif
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Dernière activité : {lastActiveAt ? formatExactDate(lastActiveAt) : '—'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function UsersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'disabled'>('all');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      fullName: '',
      role: 'user',
    },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at, disabled, department');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithProfile[] = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          role: (userRole?.role as AppRole) || 'user',
          disabled: profile.disabled || false,
          department: profile.department,
        };
      });

      return usersWithRoles;
    },
  });

  const { data: usersStatus } = useQuery({
    queryKey: ['users-status'],
    queryFn: async () => {
      const response = await supabase.functions.invoke('list-users-status');
      if (response.error) {
        console.error('Error fetching users status:', response.error);
        return {};
      }
      return response.data?.usersStatus as Record<string, UserStatus> || {};
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Non authentifié');

      const response = await supabase.functions.invoke('invite-user', {
        body: {
          ...data,
          redirectUrl: `https://ansut-lens.lovable.app/auth/reset-password`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de l\'invitation');
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success('Invitation envoyée avec succès');
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'envoi de l\'invitation');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const response = await supabase.functions.invoke('update-user-role', {
        body: { userId, newRole },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la modification du rôle');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success('Rôle mis à jour avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la modification du rôle');
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'disable' | 'enable' }) => {
      const response = await supabase.functions.invoke('manage-user', {
        body: { userId, action },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la modification');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'disable' ? 'Utilisateur désactivé' : 'Utilisateur réactivé');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la modification');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await supabase.functions.invoke('manage-user', {
        body: { userId, action: 'delete' },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la suppression');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success('Utilisateur supprimé définitivement');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteUserId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async ({ userId, fullName, role }: { userId: string; fullName: string; role: AppRole }) => {
      const response = await supabase.functions.invoke('invite-user', {
        body: {
          email: '',
          fullName,
          role,
          userId,
          resend: true,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors du renvoi');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Invitation renvoyée à ${variables.fullName}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors du renvoi de l\'invitation');
    },
  });

  const confirmEmailMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await supabase.functions.invoke('manage-user', {
        body: { userId, action: 'confirm_email' },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la confirmation');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success('Email confirmé avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['users-status'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la confirmation de l\'email');
    },
  });

  const generatePasswordLinkMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await supabase.functions.invoke('generate-password-link', {
        body: { 
          userId, 
          redirectUrl: `https://ansut-lens.lovable.app/auth/reset-password` 
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la génération du lien');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: async (data) => {
      if (data?.emailSent) {
        toast.success(data.message || 'Email de réinitialisation envoyé');
      } else if (data?.link) {
        try {
          await navigator.clipboard.writeText(data.link);
          toast.warning('Email non envoyé - Lien copié dans le presse-papiers', {
            description: data.message,
          });
        } catch {
          toast.info('Lien généré (copie auto échouée)', {
            description: data.link,
            duration: 15000,
          });
        }
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la génération du lien');
    },
  });

  const onSubmit = (data: InviteFormData) => {
    inviteMutation.mutate(data);
  };

  const handleRoleChange = (userId: string, newRole: AppRole) => {
    updateRoleMutation.mutate({ userId, newRole });
  };

  // Calculer les compteurs enrichis avec neverConnected
  const userCounts = useMemo(() => {
    if (!users) return { total: 0, active: 0, pending: 0, disabled: 0, online: 0, admins: 0, neverConnected: 0, dormant: 0, passwordNotSet: 0 };
    
    let active = 0;
    let pending = 0;
    let disabled = 0;
    let online = 0;
    let admins = 0;
    let neverConnected = 0;
    let dormant = 0;
    let passwordNotSet = 0;
    
    users.forEach(user => {
      if (user.role === 'admin') admins++;
      
      const status = usersStatus?.[user.id];
      const category = getActivityCategory(
        status?.last_active_at || null,
        !!status?.email_confirmed_at,
        user.disabled,
        status?.password_set_at ?? null
      );

      switch (category) {
        case 'disabled': disabled++; break;
        case 'pending': pending++; break;
        case 'password_not_set': passwordNotSet++; break;
        case 'never_connected': neverConnected++; active++; break;
        case 'dormant': dormant++; active++; break;
        case 'online': online++; active++; break;
        case 'active': active++; break;
      }
    });
    
    return { total: users.length, active, pending, disabled, online, admins, neverConnected, dormant, passwordNotSet };
  }, [users, usersStatus]);

  // Filtrer les utilisateurs
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter(user => {
      const status = usersStatus?.[user.id];
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const fullName = (user.full_name || '').toLowerCase();
        const email = (status?.email || '').toLowerCase();
        const department = (user.department || '').toLowerCase();
        
        if (!fullName.includes(query) && !email.includes(query) && !department.includes(query)) {
          return false;
        }
      }
      
      if (statusFilter !== 'all') {
        if (statusFilter === 'disabled' && !user.disabled) return false;
        if (statusFilter === 'pending' && (user.disabled || status?.email_confirmed_at)) return false;
        if (statusFilter === 'active' && (user.disabled || !status?.email_confirmed_at)) return false;
      }
      
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      
      return true;
    });
  }, [users, usersStatus, statusFilter, roleFilter, searchQuery]);

  return (
    <div className="container max-w-6xl py-8">
      {/* Header avec titre et bouton d'invitation */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-2 -ml-2 mb-2">
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4" />
            Retour à l'administration
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-7 w-7" />
              Gouvernance des Accès
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gérez les membres de l'équipe, leurs rôles et la sécurité du compte.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Inviter un membre
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inviter un nouvel utilisateur</DialogTitle>
                <DialogDescription>
                  L'utilisateur recevra un email avec un lien pour créer son mot de passe.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input placeholder="Jean Dupont" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="jean.dupont@ansut.ci" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rôle</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un rôle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Analyste
                              </div>
                            </SelectItem>
                            <SelectItem value="council_user">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Décideur
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Administrateur
                              </div>
                            </SelectItem>
                            <SelectItem value="guest">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Observateur
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" disabled={inviteMutation.isPending}>
                      {inviteMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Envoyer l'invitation
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs de sécurité enrichis */}
      <div className="mb-6">
        <SecurityKpiCards
          totalUsers={userCounts.total}
          activeUsers={userCounts.active}
          onlineUsers={userCounts.online}
          pendingInvitations={userCounts.pending}
          adminCount={userCounts.admins}
          isLoading={isLoading}
        />
      </div>

      {/* Suivi des invitations en cours */}
      {users && usersStatus && (
        <div className="mb-6">
          <InvitationTracker
            users={users}
            usersStatus={usersStatus}
            onResendInvite={(userId, fullName, role) =>
              resendInviteMutation.mutate({ userId, fullName, role: role as any })
            }
            isResending={resendInviteMutation.isPending}
          />
        </div>
      )}

      {/* Barre de filtres avec toggle vue */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Recherche textuelle */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou département..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Statut :</span>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Actifs
                </div>
              </SelectItem>
              <SelectItem value="pending">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  En attente
                </div>
              </SelectItem>
              <SelectItem value="disabled">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  Désactivés
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rôle :</span>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="admin">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Administrateur
                </div>
              </SelectItem>
              <SelectItem value="user">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Analyste
                </div>
              </SelectItem>
              <SelectItem value="council_user">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Décideur
                </div>
              </SelectItem>
              <SelectItem value="guest">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Observateur
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(statusFilter !== 'all' || roleFilter !== 'all' || searchQuery) && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => { setStatusFilter('all'); setRoleFilter('all'); setSearchQuery(''); }}
          >
            Réinitialiser
          </Button>
        )}

        {/* Toggle Vue Cartes/Table */}
        <div className="ml-auto">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'cards' | 'table')}>
            <ToggleGroupItem value="cards" aria-label="Vue cartes" className="px-3">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Vue table" className="px-3">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Compteur de résultats */}
      {users && filteredUsers.length !== users.length && (
        <p className="text-sm text-muted-foreground mb-4">
          Affichage de {filteredUsers.length} sur {users.length} utilisateurs
        </p>
      )}

      {/* Contenu principal */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === 'cards' ? (
        /* Vue Cartes */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              status={usersStatus?.[user.id]}
              isCurrentUser={user.id === currentUser?.id}
              onToggle={(userId, action) => toggleUserMutation.mutate({ userId, action })}
              onDelete={(userId) => setDeleteUserId(userId)}
              onResendInvite={(userId, fullName, role) => resendInviteMutation.mutate({ userId, fullName, role })}
              onConfirmEmail={(userId) => confirmEmailMutation.mutate(userId)}
              onGeneratePasswordLink={(userId) => generatePasswordLinkMutation.mutate(userId)}
            />
          ))}
          {/* Carte d'invitation rapide */}
          <InviteQuickCard onClick={() => setIsDialogOpen(true)} />
        </div>
      ) : (
        /* Vue Table */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Liste des utilisateurs</CardTitle>
            <CardDescription>
              Cliquez sur le rôle pour le modifier
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Département</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Dernière activité</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const isCurrentUserRow = user.id === currentUser?.id;
                    const status = usersStatus?.[user.id];
                    const category = getActivityCategory(
                      status?.last_active_at || null,
                      !!status?.email_confirmed_at,
                      user.disabled,
                      status?.password_set_at ?? null
                    );
                    
                    // Couleur du texte dernière activité dans la table
                    const activityTextClass =
                      category === 'online' ? 'text-emerald-600 dark:text-emerald-400 font-medium' :
                      category === 'never_connected' ? 'text-slate-400 dark:text-slate-500 italic' :
                      category === 'password_not_set' ? 'text-rose-600 dark:text-rose-400 italic' :
                      category === 'dormant' ? 'text-orange-600 dark:text-orange-400' :
                      '';

                    return (
                      <TableRow key={user.id} className={user.disabled ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(user.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              {category === 'online' && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                              )}
                              {category === 'dormant' && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-orange-400 border-2 border-background" />
                              )}
                              {category === 'password_not_set' && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-background" />
                              )}
                              {category === 'never_connected' && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-background flex items-center justify-center">
                                  <span className="block h-[1px] w-1.5 bg-slate-500 dark:bg-slate-400 rotate-45" />
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {user.full_name || 'Sans nom'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {status?.email || '—'}
                                {isCurrentUserRow && ' (vous)'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.department ? (
                            <Badge variant="secondary" className="text-xs">
                              {user.department}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isCurrentUserRow || user.disabled ? (
                            <Badge className={roleColors[user.role]} variant="secondary">
                              {roleLabels[user.role]}
                            </Badge>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-auto p-0 hover:bg-transparent"
                                  disabled={updateRoleMutation.isPending}
                                >
                                  <Badge 
                                    className={`${roleColors[user.role]} cursor-pointer hover:opacity-80`} 
                                    variant="secondary"
                                  >
                                    {updateRoleMutation.isPending ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : null}
                                    {roleLabels[user.role]}
                                    <ChevronDown className="ml-1 h-3 w-3" />
                                  </Badge>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {(Object.keys(roleLabels) as AppRole[]).map((role) => (
                                  <DropdownMenuItem
                                    key={role}
                                    onClick={() => handleRoleChange(user.id, role)}
                                    className="flex items-center gap-2"
                                    disabled={role === user.role}
                                  >
                                    {roleIcons[role]}
                                    <span className={role === user.role ? 'font-semibold' : ''}>
                                      {roleLabels[role]}
                                    </span>
                                    {role === user.role && (
                                      <span className="text-xs text-muted-foreground ml-auto">actuel</span>
                                    )}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <TableActivityBadge category={category} lastActiveAt={status?.last_active_at || null} />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <span className={activityTextClass}>
                            {formatLastActivity(status?.last_active_at || null)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {!isCurrentUserRow && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!status?.email_confirmed_at && !user.disabled && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => confirmEmailMutation.mutate(user.id)}
                                      disabled={confirmEmailMutation.isPending}
                                    >
                                      <MailCheck className="mr-2 h-4 w-4" />
                                      Confirmer l'email
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                {!user.disabled && (
                                  <DropdownMenuItem
                                    onClick={() => generatePasswordLinkMutation.mutate(user.id)}
                                    disabled={generatePasswordLinkMutation.isPending}
                                  >
                                    <KeyRound className="mr-2 h-4 w-4" />
                                    Réinitialiser mot de passe
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => resendInviteMutation.mutate({ 
                                    userId: user.id, 
                                    fullName: user.full_name || 'Utilisateur',
                                    role: user.role 
                                  })}
                                  disabled={resendInviteMutation.isPending}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Renvoyer l'invitation
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.disabled ? (
                                  <DropdownMenuItem
                                    onClick={() => toggleUserMutation.mutate({ userId: user.id, action: 'enable' })}
                                    disabled={toggleUserMutation.isPending}
                                  >
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Réactiver
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => toggleUserMutation.mutate({ userId: user.id, action: 'disable' })}
                                    disabled={toggleUserMutation.isPending}
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Désactiver
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteUserId(user.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {users && users.length > 0 ? (
                  <>
                    <p>Aucun utilisateur ne correspond aux filtres sélectionnés</p>
                    <Button 
                      variant="link" 
                      onClick={() => { setStatusFilter('all'); setRoleFilter('all'); setSearchQuery(''); }}
                    >
                      Réinitialiser les filtres
                    </Button>
                  </>
                ) : (
                  <p>Aucun utilisateur trouvé</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'utilisateur{' '}
              <strong>{users?.find((u) => u.id === deleteUserId)?.full_name || 'Sans nom'}</strong>{' '}
              et toutes ses données seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteUserMutation.mutate(deleteUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
