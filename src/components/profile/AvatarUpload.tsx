import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AvatarUploadProps {
  currentUrl?: string | null;
  fullName?: string | null;
  onUpload: (file: File) => Promise<string>;
  isUploading?: boolean;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function AvatarUpload({ currentUrl, fullName, onUpload, isUploading }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Format non supporté', { description: 'Veuillez sélectionner une image JPEG, PNG ou WebP.' });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Fichier trop volumineux', { description: 'La taille maximum est de 2 Mo.' });
      return;
    }

    try {
      setUploading(true);
      await onUpload(file);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const isLoading = uploading || isUploading;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="h-24 w-24 border-2 border-border">
          <AvatarImage src={currentUrl || undefined} alt={fullName || 'Avatar'} />
          <AvatarFallback className="text-2xl bg-primary/10 text-primary">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isLoading}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
        className="gap-2"
      >
        <Camera className="h-4 w-4" />
        Changer la photo
      </Button>
    </div>
  );
}
