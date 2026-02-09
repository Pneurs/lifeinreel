import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Compilation } from '@/types/journey';

const mapRow = (c: any): Compilation => ({
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
  isDraft: c.is_draft ?? false,
  createdAt: c.created_at,
  updatedAt: c.updated_at,
});

export const useCompilations = () => {
  const [compilations, setCompilations] = useState<Compilation[]>([]);
  const [drafts, setDrafts] = useState<Compilation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCompilations = useCallback(async () => {
    if (!user) {
      setCompilations([]);
      setDrafts([]);
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
      setDrafts([]);
    } else {
      const all = (data || []).map(mapRow);
      setCompilations(all.filter((c) => !c.isDraft));
      setDrafts(all.filter((c) => c.isDraft));
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCompilations();
  }, [fetchCompilations]);

  const uploadVideo = async (videoBlob: Blob, userId: string): Promise<string> => {
    const fileName = `${userId}/${Date.now()}-compilation.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('compilations')
      .upload(fileName, videoBlob, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('compilations')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const saveCompilation = async (params: {
    title: string;
    description?: string;
    videoBlob: Blob;
    duration: number;
    clipCount: number;
    clipIds: string[];
    journeyId?: string;
    isDraft?: boolean;
  }): Promise<Compilation | null> => {
    if (!user) return null;

    try {
      const videoUrl = await uploadVideo(params.videoBlob, user.id);

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
          is_draft: params.isDraft ?? false,
        } as any)
        .select()
        .single() as { data: any; error: any };

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      const newCompilation = mapRow(data);

      if (newCompilation.isDraft) {
        setDrafts((prev) => [newCompilation, ...prev]);
      } else {
        setCompilations((prev) => [newCompilation, ...prev]);
      }

      return newCompilation;
    } catch (error) {
      console.error('Save compilation error:', error);
      return null;
    }
  };

  const promoteDraft = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('compilations')
      .update({ is_draft: false } as any)
      .eq('id', id) as { error: any };

    if (error) {
      console.error('Promote draft error:', error);
      return false;
    }

    setDrafts((prev) => {
      const draft = prev.find((c) => c.id === id);
      if (draft) {
        setCompilations((comp) => [{ ...draft, isDraft: false }, ...comp]);
      }
      return prev.filter((c) => c.id !== id);
    });

    return true;
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
    setDrafts((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  return {
    compilations,
    drafts,
    loading,
    saveCompilation,
    promoteDraft,
    deleteCompilation,
    refetch: fetchCompilations,
  };
};
