import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabaseClient as supabase } from '@thrive/shared';
import { SPACING, ThemedText } from '../../design';
import { AuthButton, AuthError, AuthField, AuthLink, AuthScaffold } from '../../components/account/AuthScaffold';

// Mot de passe oublié : le lien reçu par courriel ouvre la page web
// /reset-password (universal link si l'app est installée), où le nouveau mot de
// passe est choisi avec la même règle que partout (12 caractères).
const RESET_URL = 'https://app.thrivesportpositive.com/reset-password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Entre une adresse courriel valide.'); return; }
    setError('');
    setBusy(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: RESET_URL });
      setSent(true); // même message que le compte existe ou non (pas d'énumération)
    } catch {
      setError('Envoi impossible pour le moment. Vérifie ta connexion et réessaie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScaffold>
      <ThemedText variant="title1" accessibilityRole="header" style={{ marginBottom: SPACING.space2 }}>Mot de passe oublié</ThemedText>
      {sent ? (
        <ThemedText variant="body" color="label2" accessibilityRole="alert" style={{ marginBottom: SPACING.space8 }}>
          Si un compte existe pour cette adresse, un courriel vient de partir avec un lien pour choisir un nouveau mot de passe.
        </ThemedText>
      ) : (
        <>
          <ThemedText variant="body" color="label2" style={{ marginBottom: SPACING.space6 }}>
            Entre ton courriel : on t’envoie un lien pour en choisir un nouveau.
          </ThemedText>
          <AuthField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <AuthError message={error} />
          <AuthButton label={busy ? 'Envoi…' : 'Envoyer le lien'} onPress={submit} disabled={busy} />
        </>
      )}
      <AuthLink label="Retour à la connexion" onPress={() => router.replace('/(auth)/login')}>
        <ThemedText variant="subheadline" color="label2">Retour à la connexion</ThemedText>
      </AuthLink>
    </AuthScaffold>
  );
}
