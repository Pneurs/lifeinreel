import React, { useRef, useState } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface JourneyPhotoUploadProps {
  currentPhoto?: string;
  onPhotoUploaded: (url: string) => void;
  size?: 'sm' | 'lg';
  fallbackIcon?: React.ReactNode;
  className?: string;
}

export const JourneyPhotoUpload: React.FC<JourneyPhotoUploadProps> = ({
  currentPhoto,
  onPhotoUploaded,
  size = 'lg',
  fallbackIcon,
  className,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const sizeClasses = size === 'lg' ? 'w-24 h-24 rounded-3xl' : 'w-14 h-14 rounded-2xl';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/journey-photos/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(path);

      onPhotoUploaded(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={cn(
          sizeClasses,
          'relative overflow-hidden flex items-center justify-center border-2 border-dashed border-border bg-muted transition-all active:scale-95',
          uploading && 'opacity-50',
          className
        )}
      >
        {currentPhoto ? (
          <>
            <img src={currentPhoto} alt="Journey" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </>
        ) : uploading ? (
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : fallbackIcon ? (
          <div className="relative">
            {fallbackIcon}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
              <ImagePlus className="w-2.5 h-2.5 text-primary-foreground" />
            </div>
          </div>
        ) : (
          <ImagePlus className="w-6 h-6 text-muted-foreground" />
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
};
