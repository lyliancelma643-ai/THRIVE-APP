import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export type OnboardingStep = {
  key: string
  title: string
  completed: boolean
}

const COACH_STEPS: OnboardingStep[] = [
  { key: 'profile', title: 'Compléter ton profil', completed: false },
  { key: 'specialty', title: 'Tes spécialités sportives', completed: false },
  { key: 'first_program', title: 'Créer ton premier programme', completed: false },
  { key: 'invite_parent', title: 'Inviter un parent', completed: false },
]

const PARENT_STEPS: OnboardingStep[] = [
  { key: 'profile', title: 'Votre profil famille', completed: false },
  { key: 'add_child', title: 'Ajouter votre enfant', completed: false },
  { key: 'find_coach', title: 'Trouver un coach', completed: false },
  { key: 'discover', title: 'Découvrir la méthode THRIVE', completed: false },
]

export function useOnboarding() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  const role = profile?.role as 'coach' | 'parent' | undefined
  const steps = role === 'coach' ? COACH_STEPS : PARENT_STEPS

  const stepsWithStatus: OnboardingStep[] = steps.map((s) => ({
    ...s,
    completed: completedSteps.includes(s.key),
  }))

  const loadProgress = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('onboarding_progress')
      .select('step_key')
      .eq('user_id', user.id)
    if (data) setCompletedSteps(data.map((d) => d.step_key))
  }, [user])

  const completeStep = useCallback(
    async (stepKey: string) => {
      if (!user || !role) return
      setLoading(true)
      try {
        await supabase.from('onboarding_progress').upsert(
          { user_id: user.id, role, step_key: stepKey },
          { onConflict: 'user_id,step_key' }
        )
        setCompletedSteps((prev) => [...new Set([...prev, stepKey])])

        // Vérifier si toutes les étapes sont faites
        const allKeys = steps.map((s) => s.key)
        const newCompleted = [...new Set([...completedSteps, stepKey])]
        const allDone = allKeys.every((k) => newCompleted.includes(k))
        if (allDone) {
          await supabase.rpc('complete_onboarding', { p_user_id: user.id })
        }
      } finally {
        setLoading(false)
      }
    },
    [user, role, steps, completedSteps]
  )

  const skipOnboarding = useCallback(async () => {
    if (!user) return
    await supabase.rpc('complete_onboarding', { p_user_id: user.id })
  }, [user])

  const isOnboardingDone = profile?.onboarding_completed === true
  const progress = completedSteps.length / steps.length

  return {
    steps: stepsWithStatus,
    progress,
    isOnboardingDone,
    loading,
    loadProgress,
    completeStep,
    skipOnboarding,
  }
}
