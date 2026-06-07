import { useEffect, useState, useCallback } from 'react';
import { supabaseClient as supabase } from '../lib/supabase';

export interface Badge {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  category: 'participation' | 'progress' | 'achievement' | 'social' | 'special';
  condition_type: string;
  condition_value: number;
  is_active: boolean;
}

export interface ChildBadge {
  id: string;
  child_id: string;
  badge_id: string;
  earned_at: string;
  awarded_by?: string;
  note?: string;
  badge?: Badge;
}

export function useBadges() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('badges')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .then(({ data }: any) => {
        setBadges(data ?? []);
        setIsLoading(false);
      });
  }, []);

  return { badges, isLoading };
}

export function useChildBadges(childId?: string) {
  const [childBadges, setChildBadges] = useState<ChildBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!childId) { setIsLoading(false); return; }
    const { data } = await supabase
      .from('child_badges')
      .select('*, badge:badges(*)')
      .eq('child_id', childId)
      .order('earned_at', { ascending: false });
    setChildBadges(data ?? []);
    setIsLoading(false);
  }, [childId]);

  useEffect(() => { fetch(); }, [fetch]);

  const awardBadge = async (childId: string, badgeId: string, note?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('child_badges').insert({
      child_id: childId,
      badge_id: badgeId,
      awarded_by: user?.id,
      note,
      earned_at: new Date().toISOString(),
    });
    if (error && !error.message.includes('unique')) throw new Error(error.message);
    await fetch();
  };

  // Vérification automatique des conditions de badge
  const checkAndAwardBadges = async (childId: string) => {
    const [sessionsRes, responsesRes, enrollmentsRes, badgesRes] = await Promise.all([
      supabase.from('sessions').select('id, status').eq('child_id', childId).eq('status', 'COMPLETED'),
      supabase.from('questionnaire_responses').select('id').eq('child_id', childId),
      supabase.from('program_enrollments').select('id, completed_at').eq('child_id', childId).not('completed_at', 'is', null),
      supabase.from('badges').select('*').eq('is_active', true),
    ]);

    const completedSessions = sessionsRes.data?.length ?? 0;
    const completedQuestionnaires = responsesRes.data?.length ?? 0;
    const completedPrograms = enrollmentsRes.data?.length ?? 0;
    const allBadges: Badge[] = badgesRes.data ?? [];

    const existingRes = await supabase.from('child_badges').select('badge_id').eq('child_id', childId);
    const existing = new Set((existingRes.data ?? []).map((b: any) => b.badge_id));

    for (const badge of allBadges) {
      if (existing.has(badge.id)) continue;
      let earned = false;
      switch (badge.condition_type) {
        case 'sessions_completed': earned = completedSessions >= badge.condition_value; break;
        case 'questionnaires_completed': earned = completedQuestionnaires >= badge.condition_value; break;
        case 'program_completed': earned = completedPrograms >= badge.condition_value; break;
      }
      if (earned) await awardBadge(childId, badge.id, 'Attribution automatique');
    }
  };

  return { childBadges, isLoading, awardBadge, checkAndAwardBadges, refetch: fetch };
}
