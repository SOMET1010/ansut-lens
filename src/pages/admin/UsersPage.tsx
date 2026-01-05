import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, Loader2, Mail, Shield, User, Users, ChevronDown, MoreVertical, UserX, UserCheck, Trash2, RefreshCw, Clock } from 'lucide-react';
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs</CardTitle>
          <CardDescription>
            Liste des utilisateurs ayant accès à la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users && users.length > 0 ? (
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
                {users.map((user) => {
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
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            Actif
                          </Badge>
                        )}
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
              Aucun utilisateur trouvé
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
