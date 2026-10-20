import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabaseClient as supabase } from '@thrive/shared';
import { Button, Field, GlassButton, List, NavBar, Section, ThemedText, useNavBarHeight, useTheme } from '../../design';

// Mot de passe oublié : le lien reçu par courriel ouvre la page web
// /reset-password (universal link si l'app est installée), où le nouveau mot de
// passe est choisi avec la même règle que partout (12 caractères).
const RESET_URL = 'https://app.thrivesportpositive.com/reset-password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const navH = useNavBarHeight();
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

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgGrouped }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: navH + 12, paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 16 }}>
          <ThemedText variant="title1" accessibilityRole="header">Mot de passe oublié</ThemedText>
          {sent ? (
            <ThemedText variant="body" color="label2" accessibilityRole="alert" style={{ marginTop: 6 }}>
              Si un compte existe pour cette adresse, un courriel vient de partir avec un lien pour choisir un nouveau mot de passe.
            </ThemedText>
          ) : (
            <ThemedText variant="body" color="label2" style={{ marginTop: 6 }}>
              Entre ton courriel : on t’envoie un lien pour en choisir un nouveau.
            </ThemedText>
          )}
        </View>
        {sent ? (
          <Section style={{ marginTop: 28 }}>
            <Button label="Retour à la connexion" onPress={() => router.replace('/(auth)/login')} />
          </Section>
        ) : (
          <>
            <Section style={{ marginTop: 22 }}>
              <List>
                <Field label="Courriel" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" returnKeyType="send" onSubmitEditing={submit} />
              </List>
              {error ? (
                <View accessibilityRole="alert" style={{ paddingTop: 10, paddingHorizontal: 16 }}>
                  <ThemedText variant="sub" color="sysRed">{error}</ThemedText>
                </View>
              ) : null}
            </Section>
            <Section style={{ marginTop: 28 }}>
              <Button label={busy ? 'Envoi…' : 'Envoyer le lien'} onPress={submit} disabled={busy} />
            </Section>
          </>
        )}
      </ScrollView>
      <NavBar left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={back} />} />
    </KeyboardAvoidingView>
  );
}
