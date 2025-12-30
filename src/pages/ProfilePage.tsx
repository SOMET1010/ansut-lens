import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AvatarUpload, ProfileForm } from '@/components/profile';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile, isUpdating, uploadAvatar } = useUserProfile();

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-8">
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
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-2 -ml-2">
          <Link to="/radar">
            <ArrowLeft className="h-4 w-4" />
            Retour au tableau de bord
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Mon profil</CardTitle>
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
            onSubmit={updateProfile}
            isSubmitting={isUpdating}
          />
        </CardContent>
      </Card>
    </div>
  );
}
