import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, Loader2, Mail, Shield, User, Users, ChevronDown, MoreVertical, UserX, UserCheck, Trash2, RefreshCw, Clock, Search, X, MailCheck, KeyRound } from 'lucide-react';
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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';

interface UserStatus {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
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
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrateur',
  user: 'Utilisateur',
  council_user: 'Membre du conseil',
  guest: 'Invité',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  user: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  council_user: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  guest: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const roleIcons: Record<AppRole, React.ReactNode> = {
  admin: <Shield className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
  council_user: <Users className="h-4 w-4" />,
  guest: <Mail className="h-4 w-4" />,
};

export default function UsersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'disabled'>('all');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Récupérer les utilisateurs avec leurs rôles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at, disabled');

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
        };
      });

      return usersWithRoles;
    },
  });

  // Récupérer le statut de confirmation des utilisateurs
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

  // Mutation pour inviter un utilisateur
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Non authentifié');

      const response = await supabase.functions.invoke('invite-user', {
        body: {
          ...data,
          redirectUrl: `${window.location.origin}/auth/reset-password`,
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

  // Mutation pour changer le rôle
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

  // Mutation pour désactiver/réactiver un utilisateur
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

  // Mutation pour supprimer un utilisateur
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

  // Mutation pour renvoyer une invitation
  const resendInviteMutation = useMutation({
    mutationFn: async ({ userId, fullName, role }: { userId: string; fullName: string; role: AppRole }) => {
      // On utilise l'edge function invite-user qui gère aussi le renvoi
      const response = await supabase.functions.invoke('invite-user', {
        body: {
          email: '', // sera ignoré, on utilise l'userId
          fullName,
          role,
          userId, // pour identifier que c'est un renvoi
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

  // Mutation pour confirmer l'email manuellement
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

  // Mutation pour générer un lien de création de mot de passe
  const generatePasswordLinkMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await supabase.functions.invoke('generate-password-link', {
        body: { 
          userId, 
          redirectUrl: `${window.location.origin}/auth/reset-password` 
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
        // Fallback: copier le lien si l'email n'a pas été envoyé
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

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculer les compteurs
  const userCounts = useMemo(() => {
    if (!users) return { total: 0, active: 0, pending: 0, disabled: 0 };
    
    let active = 0;
    let pending = 0;
    let disabled = 0;
    
    users.forEach(user => {
      if (user.disabled) {
        disabled++;
      } else if (usersStatus?.[user.id]?.email_confirmed_at) {
        active++;
      } else {
        pending++;
      }
    });
    
    return { total: users.length, active, pending, disabled };
  }, [users, usersStatus]);

  // Filtrer les utilisateurs
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter(user => {
      const status = usersStatus?.[user.id];
      
      // Recherche textuelle par nom ou email
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const fullName = (user.full_name || '').toLowerCase();
        const email = (status?.email || '').toLowerCase();
        
        if (!fullName.includes(query) && !email.includes(query)) {
          return false;
        }
      }
      
      // Filtre par statut
      if (statusFilter !== 'all') {
        if (statusFilter === 'disabled' && !user.disabled) return false;
        if (statusFilter === 'pending' && (user.disabled || status?.email_confirmed_at)) return false;
        if (statusFilter === 'active' && (user.disabled || !status?.email_confirmed_at)) return false;
      }
      
      // Filtre par rôle
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      
      return true;
    });
  }, [users, usersStatus, statusFilter, roleFilter, searchQuery]);

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button variant="ghost" asChild className="gap-2 -ml-2 mb-2">
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4" />
              Retour à l'administration
            </Link>
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Gestion des utilisateurs
          </h1>
        </div>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{userCounts.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actifs</p>
                <p className="text-2xl font-bold text-green-600">{userCounts.active}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-amber-600">{userCounts.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Désactivés</p>
                <p className="text-2xl font-bold text-muted-foreground">{userCounts.disabled}</p>
              </div>
              <UserX className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Inviter un utilisateur
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
                              Utilisateur
                            </div>
                          </SelectItem>
                          <SelectItem value="council_user">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Membre du conseil
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
                              Invité
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

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs</CardTitle>
          <CardDescription>
            Liste des utilisateurs ayant accès à la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Barre de filtres */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Recherche textuelle */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email..."
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
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
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
                <SelectTrigger className="w-[180px]">
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
                      Utilisateur
                    </div>
                  </SelectItem>
                  <SelectItem value="council_user">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Membre du conseil
                    </div>
                  </SelectItem>
                  <SelectItem value="guest">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Invité
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
          </div>

          {/* Compteur de résultats */}
          {users && filteredUsers.length !== users.length && (
            <p className="text-sm text-muted-foreground mb-4">
              Affichage de {filteredUsers.length} sur {users.length} utilisateurs
            </p>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date de création</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const isCurrentUser = user.id === currentUser?.id;
                  
                  return (
                    <TableRow key={user.id} className={user.disabled ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {user.full_name || 'Sans nom'}
                            </span>
                            {isCurrentUser && (
                              <span className="text-xs text-muted-foreground">(vous)</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isCurrentUser || user.disabled ? (
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
                          {user.disabled ? (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground">
                              Désactivé
                            </Badge>
                          ) : !usersStatus?.[user.id]?.email_confirmed_at ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 gap-1 cursor-help">
                                    <Clock className="h-3 w-3" />
                                    En attente
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>L'utilisateur n'a pas encore activé son compte via le lien d'invitation</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 cursor-help">
                                      Actif
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      Dernière connexion :{' '}
                                      {usersStatus?.[user.id]?.last_sign_in_at
                                        ? new Date(usersStatus[user.id].last_sign_in_at!).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })
                                        : 'Jamais'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {/* Badge Jamais connecté - utilisateur confirmé mais sans connexion */}
                              {!usersStatus?.[user.id]?.last_sign_in_at && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-600 gap-1 cursor-help">
                                        <Clock className="h-3 w-3" />
                                        Jamais connecté
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>L'utilisateur n'a pas encore défini son mot de passe</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        {!isCurrentUser && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!usersStatus?.[user.id]?.email_confirmed_at && !user.disabled && (
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
                              {/* Réinitialiser mot de passe - visible pour tous les utilisateurs actifs */}
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
                    onClick={() => { setStatusFilter('all'); setRoleFilter('all'); }}
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
