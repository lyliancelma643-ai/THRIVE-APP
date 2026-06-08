import React, { useEffect } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'

/**
 * Guard à placer dans _layout.tsx root.
 * Redirige vers /onboarding si l'utilisateur est connecté
 * mais n'a pas encore complété l'onboarding.
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    if (!user) return
    if (!profile) return

    const inOnboarding = segments[0] === 'onboarding'
    const needsOnboarding = !profile.onboarding_completed

    if (needsOnboarding && !inOnboarding) {
      router.replace('/onboarding')
    }
  }, [user, profile, loading, segments])

  return <>{children}</>
}
