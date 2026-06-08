import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const THRIVE_GREEN = '#00C896'
const THRIVE_DARK = '#0D1B2A'

interface Props {
  onComplete: () => void
}

export default function OnboardingProfileStep({ onComplete }: Props) {
  const { user, profile } = useAuth()
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName] = useState(profile?.last_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri)
    }
  }

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    try {
      let avatarUrl = profile?.avatar_url

      // Upload avatar si sélectionné
      if (avatarUri) {
        const ext = avatarUri.split('.').pop()
        const path = `avatars/${user.id}.${ext}`
        const response = await fetch(avatarUri)
        const blob = await response.blob()
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, blob, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
          avatarUrl = urlData.publicUrl
        }
      }

      // Mise à jour profil
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl,
        })
        .eq('id', user.id)

      if (error) throw error
      onComplete()
    } catch (e: any) {
      Alert.alert('Erreur', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Avatar picker */}
      <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>{avatarUri ? '✅' : '📷'}</Text>
        </View>
        <Text style={styles.avatarLabel}>
          {avatarUri ? 'Photo sélectionnée' : 'Ajouter une photo'}
        </Text>
      </TouchableOpacity>

      {/* Prénom */}
      <View style={styles.field}>
        <Text style={styles.label}>Prénom</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Ton prénom"
          placeholderTextColor="rgba(255,255,255,0.3)"
        />
      </View>

      {/* Nom */}
      <View style={styles.field}>
        <Text style={styles.label}>Nom</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Ton nom de famille"
          placeholderTextColor="rgba(255,255,255,0.3)"
        />
      </View>

      {/* Bio */}
      <View style={styles.field}>
        <Text style={styles.label}>Bio courte</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Dis-nous qui tu es en quelques mots..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          numberOfLines={3}
          maxLength={160}
        />
        <Text style={styles.charCount}>{bio.length}/160</Text>
      </View>

      {/* Bouton save */}
      <TouchableOpacity
        style={[styles.saveBtn, loading && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Enregistrer et continuer</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 20 },
  avatarContainer: { alignItems: 'center', marginBottom: 8 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(0,200,150,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THRIVE_GREEN,
    marginBottom: 8,
  },
  avatarEmoji: { fontSize: 36 },
  avatarLabel: { color: THRIVE_GREEN, fontSize: 14, fontWeight: '600' },
  field: { gap: 6 },
  label: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
  },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  charCount: { color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'right' },
  saveBtn: {
    backgroundColor: THRIVE_GREEN,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
