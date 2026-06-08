import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export interface GlobalKPIs {
  total_coaches: number
  total_parents: number
  total_children: number
  total_sessions: number
  completed_sessions: number
  upcoming_sessions: number
  total_badges_awarded: number
  total_messages: number
  total_conversations: number
  completion_rate_pct: number
}

export interface MonthlyActivity {
  month: string
  sessions_count: number
  messages_count: number
  badges_awarded: number
}

export interface CoachPerformance {
  coach_id: string
  coach_name: string
  avatar_url: string | null
  total_sessions: number
  completed_sessions: number
  completion_rate_pct: number
  total_children: number
  badges_awarded: number
  last_session_date: string | null
}

export interface ChildProgress {
  child_id: string
  first_name: string
  last_name: string
  age: number
  coach_name: string
  parent_name: string
  total_sessions: number
  completed_sessions: number
  total_badges: number
  questionnaires_completed: number
  avg_score: number | null
  last_session_date: string | null
}

export interface BadgeDistribution {
  badge_id: string
  badge_name: string
  icon: string
  category: string
  awarded_count: number
  unique_children: number
  last_awarded_at: string | null
}

interface UseAnalyticsReturn {
  kpis: GlobalKPIs | null
  monthlyActivity: MonthlyActivity[]
  coachPerformance: CoachPerformance[]
  childProgress: ChildProgress[]
  badgeDistribution: BadgeDistribution[]
  loading: boolean
  error: string | null
  refresh: () => void
  exportSessionsCSV: (coachId?: string, from?: string, to?: string) => Promise<void>
}

export function useAnalytics(): UseAnalyticsReturn {
  const [kpis, setKpis] = useState<GlobalKPIs | null>(null)
  const [monthlyActivity, setMonthlyActivity] = useState<MonthlyActivity[]>([])
  const [coachPerformance, setCoachPerformance] = useState<CoachPerformance[]>([])
  const [childProgress, setChildProgress] = useState<ChildProgress[]>([])
  const [badgeDistribution, setBadgeDistribution] = useState<BadgeDistribution[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        const [kpisRes, monthlyRes, coachRes, childRes, badgeRes] = await Promise.all([
          supabase.from('analytics_global_kpis').select('*').maybeSingle(),
          supabase.from('analytics_monthly_activity').select('*'),
          supabase.from('analytics_coach_performance').select('*'),
          supabase.from('analytics_child_progress').select('*'),
          supabase.from('analytics_badge_distribution').select('*'),
        ])

        if (kpisRes.error) throw kpisRes.error
        if (monthlyRes.error) throw monthlyRes.error
        if (coachRes.error) throw coachRes.error
        if (childRes.error) throw childRes.error
        if (badgeRes.error) throw badgeRes.error

        setKpis(kpisRes.data)
        setMonthlyActivity(monthlyRes.data || [])
        setCoachPerformance(coachRes.data || [])
        setChildProgress(childRes.data || [])
        setBadgeDistribution(badgeRes.data || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur chargement analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [refreshKey])

  const exportSessionsCSV = useCallback(async (
    coachId?: string,
    from?: string,
    to?: string
  ) => {
    try {
      const { data, error: err } = await supabase.rpc('export_sessions_csv', {
        p_coach_id: coachId || null,
        p_from: from || null,
        p_to: to || null,
      })
      if (err) throw err

      // Construire le CSV
      const headers = ['ID', 'Date', 'Durée (min)', 'Statut', 'Enfant', 'Coach', 'Notes', 'Créé le']
      const rows = (data || []).map((row: Record<string, string>) => [
        row.session_id, row.date, row.duration_minutes,
        row.status, row.child_name, row.coach_name,
        `"${(row.notes || '').replace(/"/g, '""')}"`, row.created_at,
      ])

      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sessions_export_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('exportSessionsCSV error:', e)
      throw e
    }
  }, [])

  return {
    kpis,
    monthlyActivity,
    coachPerformance,
    childProgress,
    badgeDistribution,
    loading,
    error,
    refresh,
    exportSessionsCSV,
  }
}
