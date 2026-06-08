import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/layout/AdminLayout'

interface OnboardingStats {
  total_users: number
  completed: number
  in_progress: number
  not_started: number
  completion_rate: number
  avg_steps_completed: number
}

interface StepStats {
  step_key: string
  role: string
  count: number
}

export default function OnboardingStatsPage() {
  const [stats, setStats] = useState<OnboardingStats | null>(null)
  const [stepStats, setStepStats] = useState<StepStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // Stats globales
      const { data: profiles } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_step, role')
        .not('role', 'eq', 'admin')

      if (profiles) {
        const total = profiles.length
        const completed = profiles.filter((p) => p.onboarding_completed).length
        const inProgress = profiles.filter((p) => !p.onboarding_completed && p.onboarding_step > 0).length
        const notStarted = profiles.filter((p) => !p.onboarding_completed && p.onboarding_step === 0).length

        setStats({
          total_users: total,
          completed,
          in_progress: inProgress,
          not_started: notStarted,
          completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
          avg_steps_completed: total > 0
            ? Math.round(
                profiles.reduce((acc, p) => acc + (p.onboarding_step || 0), 0) / total
              )
            : 0,
        })
      }

      // Stats par étape
      const { data: steps } = await supabase
        .from('onboarding_progress')
        .select('step_key, role')
      if (steps) {
        const grouped: Record<string, StepStats> = {}
        steps.forEach((s) => {
          const key = `${s.role}:${s.step_key}`
          if (!grouped[key]) grouped[key] = { step_key: s.step_key, role: s.role, count: 0 }
          grouped[key].count++
        })
        setStepStats(Object.values(grouped))
      }
    } finally {
      setLoading(false)
    }
  }

  const coachSteps = stepStats.filter((s) => s.role === 'coach')
  const parentSteps = stepStats.filter((s) => s.role === 'parent')

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Onboarding</h1>
          <p className="text-gray-400 mt-1">Suivi de la progression des nouveaux utilisateurs</p>
        </div>

        {loading ? (
          <div className="text-gray-400">Chargement...</div>
        ) : stats ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard
                label="Taux de complétion"
                value={`${stats.completion_rate}%`}
                sub={`${stats.completed}/${stats.total_users} utilisateurs`}
                color="text-emerald-400"
              />
              <KPICard
                label="Terminé"
                value={stats.completed}
                sub="onboarding complet"
                color="text-emerald-400"
              />
              <KPICard
                label="En cours"
                value={stats.in_progress}
                sub="au moins 1 étape"
                color="text-yellow-400"
              />
              <KPICard
                label="Non commencé"
                value={stats.not_started}
                sub="0 étape effectuée"
                color="text-red-400"
              />
            </div>

            {/* Steps breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StepBreakdown title="🏃‍♂️ Coaches" steps={coachSteps} total={stats.total_users} />
              <StepBreakdown title="👨‍👩‍👧 Parents" steps={parentSteps} total={stats.total_users} />
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  )
}

function KPICard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string | number
  sub: string
  color: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-white font-medium text-sm mt-1">{label}</div>
      <div className="text-gray-400 text-xs mt-0.5">{sub}</div>
    </div>
  )
}

function StepBreakdown({
  title,
  steps,
  total,
}: {
  title: string
  steps: StepStats[]
  total: number
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {steps.map((s) => {
          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
          return (
            <div key={s.step_key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300 capitalize">{s.step_key.replace('_', ' ')}</span>
                <span className="text-emerald-400 font-semibold">{pct}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
        {steps.length === 0 && (
          <p className="text-gray-500 text-sm">Aucune donnée</p>
        )}
      </div>
    </div>
  )
}
