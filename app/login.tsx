/**
 * Écran de login — Point d'entrée unique pour tous les rôles.
 * Après connexion, AuthContext lit le rôle et NavigationGuard redirige
 * automatiquement vers le bon espace.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react-native';

const C = {
  bg: '#1b263b', surface: '#151c2b', elevated: '#1f2d42',
  accent: '#c5a059', blue: '#5aa8c5', red: '#e05252',
  textPrimary: '#ffffff', textMuted: '#cfd5e5', textFaint: '#7a8aaa',
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await signIn(email.trim(), password);
    setLoading(false);
    if (authError) setError(authError);
    // Si succès → NavigationGuard redirige automatiquement selon le rôle
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Logo */}
      <View style={styles.logoSection}>
        <Text style={styles.logo}>THRIVE</Text>
        <Text style={styles.tagline}>Connectez-vous à votre espace</Text>
      </View>

      {/* Formulaire */}
      <View style={styles.form}>
        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adresse e-mail</Text>
          <View style={[styles.inputRow, error && styles.inputError]}>
            <Mail color={C.textFaint} size={16} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor={C.textFaint}
              value={email}
              onChangeText={v => { setEmail(v); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
        </View>

        {/* Mot de passe */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mot de passe</Text>
          <View style={[styles.inputRow, error && styles.inputError]}>
            <Lock color={C.textFaint} size={16} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={C.textFaint}
              value={password}
              onChangeText={v => { setPassword(v); setError(null); }}
              secureTextEntry={!showPwd}
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPwd(v => !v)} hitSlop={8}>
              {showPwd
                ? <EyeOff color={C.textFaint} size={16} />
                : <Eye     color={C.textFaint} size={16} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Erreur */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Bouton */}
        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#1b263b" size="small" />
            : <Text style={styles.btnText}>Se connecter</Text>
          }
        </TouchableOpacity>

        {/* Info rôles */}
        <View style={styles.roleInfo}>
          <Text style={styles.roleInfoTitle}>Redirection automatique selon votre rôle :</Text>
          <Text style={styles.roleInfoRow}>👶 <Text style={{ color: C.blue }}>Parent</Text>  →  /parent</Text>
          <Text style={styles.roleInfoRow}>🏋️ <Text style={{ color: C.accent }}>Coach</Text>   →  /coach</Text>
          <Text style={styles.roleInfoRow}>🏆 <Text style={{ color: '#5ac57a' }}>Athlète</Text> →  /accueil</Text>
          <Text style={styles.roleInfoRow}>⚙️ <Text style={{ color: C.red }}>Admin</Text>   →  /admin</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: C.bg,
    paddingHorizontal: 24, justifyContent: 'center',
  },
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logo: { color: C.accent, fontSize: 40, fontWeight: '900', letterSpacing: 8 },
  tagline: { color: C.textMuted, fontSize: 15, marginTop: 8 },
  form: { gap: 16 },
  inputGroup: { gap: 6 },
  label: { color: C.textMuted, fontSize: 13, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.elevated,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  inputError: { borderColor: C.red + '88' },
  input: { flex: 1, color: C.textPrimary, fontSize: 15 },
  errorText: { color: C.red, fontSize: 13, textAlign: 'center' },
  btn: {
    backgroundColor: C.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#1b263b', fontSize: 16, fontWeight: '800' },
  roleInfo: {
    marginTop: 24, backgroundColor: C.surface,
    borderRadius: 12, padding: 16, gap: 6,
    borderWidth: 1, borderColor: C.elevated,
  },
  roleInfoTitle: { color: C.textFaint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  roleInfoRow: { color: C.textMuted, fontSize: 13 },
});
