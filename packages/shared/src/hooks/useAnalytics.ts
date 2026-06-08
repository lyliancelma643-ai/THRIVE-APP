import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface GlobalKPIs {
  total_coaches: number;
  total_parents: number;
  total_families: number;
  total_children: number;
  total_programs: number;
  active_programs: number;
  total_sessions: number;
  completed_sessions: number;
  sessions_this_month: number;
  total_messages: number;
  messages_this_month: number;
  total_badges_awarded: number;
}

export interface MonthlyActivity {
  month: string;
  sessions: number;
  messages: number;
  badges: number;
  new_programs: number;
}

export interface CoachPerformance {
  coach_id: string;
  first_name: string;
  last_name: string;
  total_programs: number;
  total_sessions: number;
  completed_sessions: number;
  cancelled_sessions: number;
  completion_rate: number;
  total_messages: number;
  badges_awarded: number;
}

export interface ChildProgress {
  child_id: string;
  first_name: string;
  last_name: string;
  age: number;
  family_id: string;
  family_name: string;
  total_sessions: number;
  completed_sessions: number;
  badges_count: number;
  last_session_at?: string;
}

export interface BadgeDistribution {
  id: string;
  name: string;
  icon?: string;
  category?: string;
  awarded_count: number;
  unique_children: number;
}

export function useAnalytics() {
  const [kpis, setKpis] = useState<GlobalKPIs | null>(null);
  const [monthlyActivity, setMonthlyActivity] = useState<MonthlyActivity[]>([]);
  const [coachPerformance, setCoachPerformance] = useState<CoachPerformance[]>([]);
  const [childProgress, setChildProgress] = useState<ChildProgress[]>([]);
  const [badgeDistribution, setBadgeDistribution] = useState<BadgeDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    const [kpisRes, monthlyRes, coachRes, childRes, badgeRes] = await Promise.all([
      supabase.from('analytics_global_kpis').select('*').single(),
      supabase.from('analytics_monthly_activity').select('*'),
      supabase.from('analytics_coach_performance').select('*'),
      supabase.from('analytics_child_progress').select('*'),
      supabase.from('analytics_badge_distribution').select('*'),
    ]);
    setKpis(kpisRes.data ?? null);
    setMonthlyActivity(monthlyRes.data ?? []);
    setCoachPerformance(coachRes.data ?? []);
    setChildProgress(childRes.data ?? []);
    setBadgeDistribution(badgeRes.data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const exportSessionsCSV = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('export_sessions_csv');
    if (error) throw new Error(error.message);
    return (data as { csv_row: string }[]).map((r) => r.csv_row).join('\n');
  };

  return {
    kpis,
    monthlyActivity,
    coachPerformance,
    childProgress,
    badgeDistribution,
    isLoading,
    refetch: fetch,
    exportSessionsCSV,
  };
}
