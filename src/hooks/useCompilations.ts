import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Compilation } from '@/types/journey';

export const useCompilations = () => {
  const [compilations, setCompilations] = useState<Compilation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCompilations = useCallback(async () => {
    if (!user) {
      setCompilations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('compilations')
      .select('*')
      .order('created_at', { ascending: false }) as { data: any[] | null; error: any };

    if (error) {
      console.error('Error fetching compilations:', error);
      setCompilations([]);
    } else {
      setCompilations(
        (data || []).map((c) => ({
          id: c.id,
          userId: c.user_id,
          title: c.title,
          description: c.description,
          videoUrl: c.video_url,
          thumbnailUrl: c.thumbnail_url,
          duration: Number(c.duration),
          clipCount: c.clip_count,
          clipIds: c.clip_ids || [],
          journeyId: c.journey_id,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        }))
      );
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCompilations();
  }, [fetchCompilations]);

  const saveCompilation = async (params: {
    title: string;
    description?: string;
    videoBlob: Blob;
    duration: number;
    clipCount: number;
    clipIds: string[];
    journeyId?: string;
  }): Promise<Compilation | null> => {
    if (!user) return null;

    try {
      // Upload video to storage
      const fileName = `${user.id}/${Date.now()}-compilation.mp4`;
      const { error: uploadError } = await supabase.storage
        .from('compilations')
        .upload(fileName, params.videoBlob, {
          contentType: 'video/mp4',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('compilations')
        .getPublicUrl(fileName);

      const videoUrl = urlData.publicUrl;

      // Insert record
      const { data, error } = await supabase
        .from('compilations')
        .insert({
          user_id: user.id,
          title: params.title,
          description: params.description || null,
          video_url: videoUrl,
          duration: params.duration,
          clip_count: params.clipCount,
          clip_ids: params.clipIds,
          journey_id: params.journeyId || null,
        } as any)
        .select()
        .single() as { data: any; error: any };

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      const newCompilation: Compilation = {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        description: data.description,
        videoUrl: data.video_url,
        thumbnailUrl: data.thumbnail_url,
        duration: Number(data.duration),
        clipCount: data.clip_count,
        clipIds: data.clip_ids || [],
        journeyId: data.journey_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setCompilations((prev) => [newCompilation, ...prev]);
      return newCompilation;
    } catch (error) {
      console.error('Save compilation error:', error);
      return null;
    }
  };

  const deleteCompilation = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('compilations')
      .delete()
      .eq('id', id) as { error: any };

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    setCompilations((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  return {
    compilations,
    loading,
    saveCompilation,
    deleteCompilation,
    refetch: fetchCompilations,
  };
};
