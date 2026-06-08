/**
 * Écran de login — point d'entrée unique pour tous les rôles.
 * Après connexion, auth.store met à jour isAuthenticated + role
 * et le NavigationGuard dans _layout.tsx redirige automatiquement.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/auth.store';

const C = {
  bg:           '#1b263b',
  surface:      '#151c2b',
  elevated:     '#1f2d42',
  accent:       '#c5a059',
  blue:         '#5aa8c5',
  red:          '#e05252',
  green:        '#5ac57a',
  textPrimary:  '#ffffff',
  textMuted:    '#cfd5e5',
  textFaint:    '#7a8aaa',
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, isLoading } = useAuthStore();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setError(null);
    try {
      await signIn(email.trim(), password);
      // Pas besoin de router.replace ici :
      // NavigationGuard dans _layout.tsx redirige selon le rôle
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de connexion.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Logo ── */}
        <View style={styles.logoSection}>
          <Text style={styles.logo}>THRIVE</Text>
          <Text style={styles.tagline}>Connectez-vous à votre espace</Text>
        </View>

        {/* ── Formulaire ── */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse e-mail</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="votre@email.com"
              placeholderTextColor={C.textFaint}
              value={email}
              onChangeText={v => { setEmail(v); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={[styles.inputRow, error ? styles.inputError : null]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={C.textFaint}
                value={password}
                onChangeText={v => { setPassword(v); setError(null); }}
                secureTextEntry={!showPwd}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPwd(v => !v)} hitSlop={8}>
                <Text style={{ color: C.textFaint, fontSize: 13 }}>
                  {showPwd ? 'Cacher' : 'Voir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, isLoading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading
              ? <ActivityIndicator color={C.bg} size="small" />
              : <Text style={styles.btnText}>Se connecter</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Info rôles (dev helper) ── */}
        <View style={styles.roleInfo}>
          <Text style={styles.roleInfoTitle}>Redirection automatique selon votre compte :</Text>
          <Text style={styles.roleInfoRow}>
            <Text style={{ color: C.blue }}>Parent</Text>{'  →  /(parent)/messages'}
          </Text>
          <Text style={styles.roleInfoRow}>
            <Text style={{ color: C.accent }}>Coach</Text>{'   →  /(coach)/inbox'}
          </Text>
          <Text style={styles.roleInfoRow}>
            <Text style={{ color: C.green }}>Athlète</Text>{' →  /(athlete)'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:     { paddingHorizontal: 24, flexGrow: 1, justifyContent: 'center' },
  logoSection:   { alignItems: 'center', marginBottom: 40 },
  logo:          { color: C.accent, fontSize: 38, fontWeight: '900', letterSpacing: 8 },
  tagline:       { color: C.textMuted, fontSize: 15, marginTop: 8 },
  form:          { gap: 16 },
  inputGroup:    { gap: 6 },
  label:         { color: C.textMuted, fontSize: 13, fontWeight: '600' },
  inputRow:      {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.elevated,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  input:         {
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.elevated,
    paddingHorizontal: 14, paddingVertical: 12,
    color: C.textPrimary, fontSize: 15,
  },
  inputError:    { borderColor: C.red + '88' },
  errorText:     { color: C.red, fontSize: 13, textAlign: 'center' },
  btn:           {
    backgroundColor: C.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnText:       { color: C.bg, fontSize: 16, fontWeight: '800' },
  roleInfo:      {
    marginTop: 32, backgroundColor: C.surface,
    borderRadius: 12, padding: 16, gap: 5,
    borderWidth: 1, borderColor: C.elevated,
  },
  roleInfoTitle: {
    color: C.textFaint, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  roleInfoRow:   { color: C.textMuted, fontSize: 13 },
});
