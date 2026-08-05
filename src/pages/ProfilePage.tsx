import { ArrowLeft, Mail, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { AvatarUpload, ProfileForm, ChangePasswordForm } from '@/components/profile';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useMatinaleSubscription } from '@/hooks/useMatinaleSubscription';
import { PageContainer, PageHeader, TermeMetier } from '@/components/common';

export default function ProfilePage() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile, isUpdating, uploadAvatar } = useUserProfile();
  const { isSubscribed, isLoading: subLoading, toggleSubscription, isToggling } = useMatinaleSubscription();

  if (isLoading) {
    return (
      <PageContainer largeur="lecture">
        <div className="w-full py-8">
          <div className="mb-6">
            <Skeleton className="h-8 w-48" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <Skeleton className="h-24 w-24 rounded-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer largeur="lecture">
      <div className="space-y-6">
        <div className="mb-6">
          <Button variant="ghost" asChild className="gap-2 -ml-2">
            <Link to="/ce-matin">
              <ArrowLeft className="h-4 w-4" />
              Retour au tableau de bord
            </Link>
          </Button>
        </div>

        <PageHeader
          titre="Mon profil"
          description="Vos informations, votre rôle et vos préférences d'affichage."
          icon={User}
        />

        <Card>
          <CardHeader className="text-center">
            {/* Suppression du titre concurrent text-2xl, rétrogradé en titre de section */}
            <CardTitle className="text-lg font-semibold">Informations personnelles</CardTitle>
            <CardDescription>
              Gérez vos informations personnelles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <AvatarUpload
              currentUrl={profile?.avatar_url}
              fullName={profile?.full_name}
              onUpload={uploadAvatar}
              isUploading={isUpdating}
            />

            <ProfileForm
              email={user?.email}
              fullName={profile?.full_name}
              phone={profile?.phone}
              onSubmit={updateProfile}
              isSubmitting={isUpdating}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            {/* Rétrogradation du titre en text-lg */}
            <CardTitle className="text-lg font-semibold">Notifications</CardTitle>
            <CardDescription>
              Gérez vos préférences de réception
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">
                    Note <TermeMetier cle="ce-matin">« Ce matin »</TermeMetier> quotidienne
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recevez chaque matin un résumé stratégique par email
                  </p>
                </div>
              </div>
              <Switch
                checked={isSubscribed}
                onCheckedChange={(checked) => toggleSubscription(checked)}
                disabled={subLoading || isToggling}
                aria-label="Activer ou désactiver la matinale quotidienne"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            {/* Rétrogradation du titre en text-lg */}
            <CardTitle className="text-lg font-semibold">Sécurité</CardTitle>
            <CardDescription>
              Modifiez votre mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
