/**
 * Écran de login — point d'entrée unique pour tous les rôles.
 * Après connexion, auth.store met à jour isAuthenticated + role
 * et le NavigationGuard dans _layout.tsx redirige automatiquement.
 *
 * Comptes de test :
 *   lyliancelma8@gmail.com          → PARENT  → /(parent)/messages
 *   lylian@thrivesportpositive.com  → COACH   → /(coach)/inbox
 *   lyliancelma643@gmail.com        → SUPER_ADMIN → /(admin)
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
  bg:          '#0f1923',
  surface:     '#18232f',
  elevated:    '#1f2e3f',
  accent:      '#c5a059',
  blue:        '#5aa8c5',
  red:         '#e05252',
  green:       '#5ac57a',
  purple:      '#a87ec5',
  text:        '#ffffff',
  muted:       '#8fa3b8',
  faint:       '#4a6070',
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
      await signIn(email.trim().toLowerCase(), password);
      // NavigationGuard dans _layout.tsx gère la redirection
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('Invalid login')) setError('Email ou mot de passe incorrect.');
      else if (msg.includes('Email not confirmed')) setError('Vérifie ton email pour confirmer ton compte.');
      else setError(msg || 'Erreur de connexion.');
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
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>T</Text>
          </View>
          <Text style={styles.logoText}>THRIVE</Text>
          <Text style={styles.tagline}>Sport • Positif • Performance</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Adresse e-mail</Text>
            <TextInput
              style={[styles.input, error ? styles.inputErr : null]}
              placeholder="votre@email.com"
              placeholderTextColor={C.faint}
              value={email}
              onChangeText={v => { setEmail(v); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={[styles.inputRow, error ? styles.inputErr : null]}>
              <TextInput
                style={styles.inputFlex}
                placeholder="••••••••"
                placeholderTextColor={C.faint}
                value={password}
                onChangeText={v => { setPassword(v); setError(null); }}
                secureTextEntry={!showPwd}
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPwd(v => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.togglePwd}>{showPwd ? 'Masquer' : 'Voir'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️  {error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
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

        {/* Comptes de test */}
        <View style={styles.devBox}>
          <Text style={styles.devTitle}>COMPTES DE TEST</Text>
          {[
            { label: 'Parent',       email: 'lyliancelma8@gmail.com',         color: C.blue,   dest: '/(parent)/messages' },
            { label: 'Coach',        email: 'lylian@thrivesportpositive.com',  color: C.accent, dest: '/(coach)/inbox' },
            { label: 'Super Admin',  email: 'lyliancelma643@gmail.com',        color: C.purple, dest: '/(admin)' },
          ].map((a) => (
            <TouchableOpacity
              key={a.email}
              style={styles.devRow}
              onPress={() => setEmail(a.email)}
            >
              <View style={[styles.devDot, { backgroundColor: a.color }]} />
              <View>
                <Text style={[styles.devLabel, { color: a.color }]}>{a.label}</Text>
                <Text style={styles.devEmail}>{a.email}</Text>
                <Text style={styles.devDest}>→ {a.dest}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { paddingHorizontal: 24, flexGrow: 1 },

  logoWrap:     { alignItems: 'center', marginBottom: 44 },
  logoIcon:     {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: C.accent + '22',
    borderWidth: 1.5, borderColor: C.accent + '55',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  logoIconText: { color: C.accent, fontSize: 32, fontWeight: '900' },
  logoText:     { color: C.text, fontSize: 34, fontWeight: '900', letterSpacing: 10 },
  tagline:      { color: C.muted, fontSize: 13, marginTop: 6, letterSpacing: 1 },

  form:         { gap: 16, marginBottom: 32 },
  field:        { gap: 8 },
  label:        { color: C.muted, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  input:        {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.elevated,
    paddingHorizontal: 16, paddingVertical: 14,
    color: C.text, fontSize: 15,
  },
  inputRow:     {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.elevated,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  inputFlex:    { flex: 1, color: C.text, fontSize: 15 },
  inputErr:     { borderColor: C.red + '99' },
  togglePwd:    { color: C.muted, fontSize: 13, marginLeft: 8 },

  errorBox:     {
    backgroundColor: C.red + '18', borderRadius: 10,
    borderWidth: 1, borderColor: C.red + '44',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText:    { color: C.red, fontSize: 13, fontWeight: '500' },

  btn:          {
    backgroundColor: C.accent, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center', marginTop: 4,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  btnDisabled:  { opacity: 0.55 },
  btnText:      { color: C.bg, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  devBox:       {
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: C.elevated,
    padding: 16, gap: 12,
  },
  devTitle:     {
    color: C.faint, fontSize: 10, fontWeight: '800',
    letterSpacing: 2, marginBottom: 4,
  },
  devRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  devDot:       { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  devLabel:     { fontSize: 13, fontWeight: '700' },
  devEmail:     { color: C.muted, fontSize: 12, marginTop: 1 },
  devDest:      { color: C.faint, fontSize: 11, marginTop: 1 },
});
