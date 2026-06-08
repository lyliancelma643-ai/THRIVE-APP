import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface GlobalKPIs {
  total_coaches: number
  total_parents: number
  total_children: number
  total_sessions: number
  completed_sessions: number
  total_messages: number
  total_badges_awarded: number
}

export interface MonthlyActivity {
  month: string
  total_sessions: number
  completed_sessions: number
  active_coaches: number
  active_children: number
}

export interface CoachStats {
  total_sessions: number
  completed_sessions: number
  completion_rate: number
  total_children: number
  badges_awarded: number
}

export function useAnalytics() {
  const { user, profile } = useAuth()
  const [globalKPIs, setGlobalKPIs] = useState<GlobalKPIs | null>(null)
  const [monthlyActivity, setMonthlyActivity] = useState<MonthlyActivity[]>([])
  const [coachStats, setCoachStats] = useState<CoachStats | null>(null)
  const [loading, setLoading] = useState(false)

  const loadGlobalKPIs = useCallback(async () => {
    const { data } = await supabase.from('analytics_global_kpis').select('*').single()
    setGlobalKPIs(data)
  }, [])

  const loadMonthlyActivity = useCallback(async () => {
    const { data } = await supabase
      .from('analytics_monthly_activity')
      .select('*')
      .order('month', { ascending: true })
    setMonthlyActivity(data || [])
  }, [])

  const loadCoachStats = useCallback(async () => {
    if (!user || profile?.role !== 'coach') return
    const { data } = await supabase
      .from('analytics_coach_performance')
      .select('*')
      .eq('coach_id', user.id)
      .single()
    setCoachStats(data)
  }, [user, profile])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadGlobalKPIs(), loadMonthlyActivity(), loadCoachStats()])
    setLoading(false)
  }, [loadGlobalKPIs, loadMonthlyActivity, loadCoachStats])

  const exportCSV = useCallback(async () => {
    if (!user) return null
    const { data } = await supabase.rpc('export_sessions_csv', {
      p_coach_id: profile?.role === 'coach' ? user.id : null,
    })
    return data
  }, [user, profile])

  return { globalKPIs, monthlyActivity, coachStats, loading, loadAll, exportCSV }
}
