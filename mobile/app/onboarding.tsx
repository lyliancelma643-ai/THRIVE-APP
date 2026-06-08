import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useAuth } from '../hooks/useAuth'
import OnboardingWizard from '../components/onboarding/OnboardingWizard'

export default function OnboardingScreen() {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && profile?.onboarding_completed) {
      // Déjà fait l'onboarding → redirect vers dashboard
      if (profile.role === 'coach') router.replace('/(coach)/dashboard')
      else router.replace('/(parent)/dashboard')
    }
  }, [profile, loading])

  return <OnboardingWizard />
}
