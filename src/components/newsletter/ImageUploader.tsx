import { useState, useRef, ChangeEvent } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploaderProps {
  value?: string;
  alt?: string;
  onImageChange: (url: string | undefined, alt?: string) => void;
  label?: string;
  className?: string;
}

export function ImageUploader({ 
  value, 
  alt = '', 
  onImageChange, 
  label = "Image",
  className = "" 
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [altText, setAltText] = useState(alt);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File, maxWidth = 800): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Could not compress image'));
            }
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setIsUploading(true);

    try {
      // Compress image
      const compressedBlob = await compressImage(file);
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const filename = `newsletter_${timestamp}_${randomId}.jpg`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('newsletter-images')
        .upload(filename, compressedBlob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error('Erreur lors de l\'upload de l\'image');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('newsletter-images')
        .getPublicUrl(data.path);

      onImageChange(publicUrl, altText);
      toast.success('Image uploadée avec succès');
    } catch (error) {
      console.error('Compression/upload error:', error);
      toast.error('Erreur lors du traitement de l\'image');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onImageChange(undefined, undefined);
    setAltText('');
  };

  const handleAltChange = (newAlt: string) => {
    setAltText(newAlt);
    if (value) {
      onImageChange(value, newAlt);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm text-muted-foreground">{label}</Label>
      
      {value ? (
        <div className="relative">
          <div className="relative rounded-lg overflow-hidden border bg-muted">
            <img 
              src={value} 
              alt={altText || 'Image newsletter'} 
              className="w-full h-32 object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2">
            <Input
              value={altText}
              onChange={(e) => handleAltChange(e.target.value)}
              placeholder="Description de l'image (alt text)"
              className="text-sm"
            />
          </div>
        </div>
      ) : (
        <div 
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload en cours...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="text-primary font-medium">Cliquer</span> ou glisser-déposer
              </div>
              <span className="text-xs text-muted-foreground/75">JPG, PNG (max 5 Mo)</span>
            </div>
          )}
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
