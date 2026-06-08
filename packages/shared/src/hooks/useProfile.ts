import { useState, useEffect } from 'react';
import { supabaseClient as supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  role: 'coach' | 'parent' | 'admin';
  onboarding_completed: boolean;
  notification_prefs: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface UpdateProfilePayload {
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  notification_prefs?: Partial<UserProfile['notification_prefs']>;
  onboarding_completed?: boolean;
}

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchProfile(userId);
  }, [userId]);

  async function fetchProfile(uid: string) {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (err) throw err;
      setProfile(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(payload: UpdateProfilePayload) {
    if (!userId) return { error: 'No user ID' };
    try {
      setUpdating(true);
      const { data, error: err } = await supabase
        .from('profiles')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (err) throw err;
      setProfile(data);
      return { data, error: null };
    } catch (err: any) {
      setError(err.message);
      return { data: null, error: err.message };
    } finally {
      setUpdating(false);
    }
  }

  async function completeOnboarding() {
    return updateProfile({ onboarding_completed: true });
  }

  async function uploadAvatar(uri: string) {
    if (!userId) return { error: 'No user ID' };
    try {
      const fileName = `avatar-${userId}-${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return updateProfile({ avatar_url: urlData.publicUrl });
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }

  return {
    profile,
    loading,
    updating,
    error,
    updateProfile,
    completeOnboarding,
    uploadAvatar,
    refetch: () => userId && fetchProfile(userId),
  };
}
