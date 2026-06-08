import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type ContentCategory =
  | 'nutrition'
  | 'entrainement'
  | 'mental'
  | 'recuperation'
  | 'parents'
  | 'technique';

export type ContentType = 'article' | 'video' | 'conseil';

export interface ContentItem {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  category: ContentCategory;
  type: ContentType;
  cover_url?: string;
  author_id: string;
  author_name?: string;
  published: boolean;
  pinned: boolean;
  views: number;
  read_time_minutes: number;
  target_roles: ('coach' | 'parent' | 'both')[];
  created_at: string;
  updated_at: string;
}

export interface CreateContentPayload {
  title: string;
  excerpt: string;
  body: string;
  category: ContentCategory;
  type: ContentType;
  cover_url?: string;
  published?: boolean;
  pinned?: boolean;
  read_time_minutes?: number;
  target_roles?: ContentItem['target_roles'];
}

export function useContent(filters?: {
  category?: ContentCategory;
  type?: ContentType;
  published?: boolean;
  target_role?: 'coach' | 'parent';
}) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContent();
  }, [filters?.category, filters?.type, filters?.published, filters?.target_role]);

  async function fetchContent() {
    try {
      setLoading(true);
      let query = supabase
        .from('content_library')
        .select('*, profiles(full_name)')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.type) query = query.eq('type', filters.type);
      if (filters?.published !== undefined) query = query.eq('published', filters.published);
      if (filters?.target_role) {
        query = query.contains('target_roles', [filters.target_role]);
      }

      const { data, error: err } = await query;
      if (err) throw err;

      const mapped = (data || []).map((item: any) => ({
        ...item,
        author_name: item.profiles?.full_name || 'Admin',
      }));
      setItems(mapped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createContent(payload: CreateContentPayload, authorId: string) {
    try {
      const { data, error: err } = await supabase
        .from('content_library')
        .insert([
          {
            ...payload,
            author_id: authorId,
            published: payload.published ?? false,
            pinned: payload.pinned ?? false,
            views: 0,
            read_time_minutes: payload.read_time_minutes ?? 3,
            target_roles: payload.target_roles ?? ['both'],
          },
        ])
        .select()
        .single();
      if (err) throw err;
      await fetchContent();
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }

  async function updateContent(id: string, payload: Partial<CreateContentPayload & { published: boolean; pinned: boolean }>) {
    try {
      const { data, error: err } = await supabase
        .from('content_library')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (err) throw err;
      await fetchContent();
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }

  async function deleteContent(id: string) {
    try {
      const { error: err } = await supabase.from('content_library').delete().eq('id', id);
      if (err) throw err;
      setItems((prev) => prev.filter((i) => i.id !== id));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  async function incrementViews(id: string) {
    await supabase.rpc('increment_content_views', { content_id: id });
  }

  return { items, loading, error, fetchContent, createContent, updateContent, deleteContent, incrementViews };
}
