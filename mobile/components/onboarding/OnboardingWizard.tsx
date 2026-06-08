import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useOnboarding } from '../../hooks/useOnboarding'
import { useAuth } from '../../hooks/useAuth'
import { Colors } from '../../constants/Colors'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const THRIVE_GREEN = '#00C896'
const THRIVE_DARK = '#0D1B2A'

export default function OnboardingWizard() {
  const { profile } = useAuth()
  const router = useRouter()
  const { steps, progress, completeStep, skipOnboarding, loadProgress } = useOnboarding()
  const [currentIndex, setCurrentIndex] = useState(0)
  const slideAnim = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(1)).current

  const role = profile?.role as 'coach' | 'parent'

  useEffect(() => {
    loadProgress()
  }, [])

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start()
  }, [progress])

  const animateToNext = (nextIndex: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -SCREEN_WIDTH * nextIndex, duration: 0, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start()
    setCurrentIndex(nextIndex)
  }

  const handleNext = async () => {
    await completeStep(steps[currentIndex].key)
    if (currentIndex < steps.length - 1) {
      animateToNext(currentIndex + 1)
    } else {
      handleFinish()
    }
  }

  const handleSkip = async () => {
    await skipOnboarding()
    handleFinish()
  }

  const handleFinish = () => {
    if (role === 'coach') router.replace('/(coach)/dashboard')
    else router.replace('/(parent)/dashboard')
  }

  const currentStep = steps[currentIndex]
  const isLast = currentIndex === steps.length - 1

  const STEP_CONTENT = getStepContent(role)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>THRIVE</Text>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Step indicators */}
      <View style={styles.dotsContainer}>
        {steps.map((step, i) => (
          <TouchableOpacity
            key={step.key}
            onPress={() => i < currentIndex && animateToNext(i)}
            style={[
              styles.dot,
              i === currentIndex && styles.dotActive,
              step.completed && styles.dotCompleted,
            ]}
          >
            {step.completed && (
              <Ionicons name="checkmark" size={10} color="#fff" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content slide */}
      <Animated.View style={[styles.slideContainer, { opacity: fadeAnim }]}>
        {STEP_CONTENT[currentIndex] && (
          <StepCard
            icon={STEP_CONTENT[currentIndex].icon}
            color={STEP_CONTENT[currentIndex].color}
            title={STEP_CONTENT[currentIndex].title}
            description={STEP_CONTENT[currentIndex].description}
            illustration={STEP_CONTENT[currentIndex].illustration}
          />
        )}
      </Animated.View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient
            colors={[THRIVE_GREEN, '#00A87A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextGradient}
          >
            <Text style={styles.nextText}>
              {isLast ? '🎉 Commencer !' : 'Continuer'}
            </Text>
            {!isLast && <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.stepCounter}>
          Étape {currentIndex + 1} sur {steps.length}
        </Text>
      </View>
    </View>
  )
}

// ─── StepCard ──────────────────────────────────────────────────────────────
interface StepCardProps {
  icon: string
  color: string
  title: string
  description: string
  illustration: string
}

function StepCard({ icon, color, title, description, illustration }: StepCardProps) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start()
  }, [title])

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      {/* Illustration emoji grande */}
      <View style={[styles.illustrationContainer, { backgroundColor: color + '20' }]}>
        <Text style={styles.illustrationText}>{illustration}</Text>
      </View>

      {/* Icon badge */}
      <View style={[styles.iconBadge, { backgroundColor: color }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </Animated.View>
  )
}

// ─── Step content par rôle ─────────────────────────────────────────────────
function getStepContent(role: 'coach' | 'parent') {
  if (role === 'coach') {
    return [
      {
        icon: '👤',
        color: THRIVE_GREEN,
        illustration: '🏃‍♂️',
        title: 'Ton profil coach',
        description:
          'Ajoute ta photo, tes spécialités et une courte bio pour que les familles te fassent confiance.',
      },
      {
        icon: '⚡',
        color: '#6C63FF',
        illustration: '🏋️',
        title: 'Tes spécialités',
        description:
          'Renseigne les sports que tu pratiques et tes certifications pour être mis en avant.',
      },
      {
        icon: '📋',
        color: '#FF6B6B',
        illustration: '📅',
        title: 'Premier programme',
        description:
          'Crée ton premier programme THRIVE avec des séances structurées et des objectifs clairs.',
      },
      {
        icon: '✉️',
        color: '#F7B731',
        illustration: '👨‍👩‍👧',
        title: 'Inviter une famille',
        description:
          'Envoie une invitation à tes premiers parents pour démarrer le suivi de leurs enfants.',
      },
    ]
  }

  return [
    {
      icon: '🏠',
      color: THRIVE_GREEN,
      illustration: '👨‍👩‍👧‍👦',
      title: 'Votre profil famille',
      description:
          'Complétez vos informations pour que votre coach puisse personnaliser le suivi.',
    },
    {
      icon: '⭐',
      color: '#FF6B6B',
      illustration: '🧒',
      title: 'Votre enfant',
      description:
          'Ajoutez le profil de votre enfant : âge, sport pratiqué, objectifs et besoins spécifiques.',
    },
    {
      icon: '🔍',
      color: '#6C63FF',
      illustration: '🤝',
      title: 'Trouver un coach',
      description:
          'Parcourez les profils de nos coachs certifiés THRIVE et demandez une première séance.',
    },
    {
      icon: '💡',
      color: '#F7B731',
      illustration: '🌟',
      title: 'La méthode THRIVE',
      description:
          '7 piliers, psychologie positive, et sport comme levier de développement global pour les 8-17 ans.',
    },
  ]
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THRIVE_DARK,
    paddingTop: Platform.OS === 'ios' ? 54 : 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  logo: {
    fontSize: 22,
    fontWeight: '800',
    color: THRIVE_GREEN,
    letterSpacing: 3,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 24,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    backgroundColor: THRIVE_GREEN,
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    width: 28,
    backgroundColor: THRIVE_GREEN,
  },
  dotCompleted: {
    backgroundColor: THRIVE_GREEN,
    opacity: 0.6,
  },
  slideContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  illustrationText: {
    fontSize: 72,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: -8,
  },
  iconText: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 12,
    alignItems: 'center',
  },
  nextBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  stepCounter: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
  },
})
