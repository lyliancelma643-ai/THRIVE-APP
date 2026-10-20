import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import {
  Arch, Button, Field, GlassButton, Lamp, List, ListRow, NavBar, Section, SectionFooter, ThemedText, useNavBarHeight,
  useTheme,
} from '../../design';
import { RoundBadge } from './RoundBadge';

export type LoginViewProps = {
  email: string;
  password: string;
  onChangeEmail: (v: string) => void;
  onChangePassword: (v: string) => void;
  /** Message d'erreur d'authentification (vide = aucun). */
  error?: string;
  loading?: boolean;
  onSubmit: () => void;
  onBack: () => void;
  /** « Recevoir un lien » : écran Mot de passe oublié. */
  onForgot: () => void;
  /** Lien secondaire vers l'inscription (absent du canevas : conservé pour ne pas enfermer un compte déconnecté). */
  onRegister?: () => void;
};

/**
 * Maquette B · Connexion : retour, titre + arche de lin 88 × 100, liste Courriel / Mot de passe, lien « Recevoir un lien »,
 * bouton prom, rangée « Double authentification » (information). Même mise en page en Lin et en Veillée (la lampe
 * et l'arche de lin suivent le style). Les testID de connexion (login-*) servent aux flux e2e.
 */
export function LoginView({
  email, password, onChangeEmail, onChangePassword, error, loading, onSubmit, onBack, onForgot, onRegister,
}: LoginViewProps) {
  const { colors } = useTheme();
  const navH = useNavBarHeight();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgGrouped }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Lamp />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: navH + 12, paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="title1" accessibilityRole="header">Content de te revoir</ThemedText>
            <ThemedText variant="body" color="label2" style={{ marginTop: 6 }}>Connecte-toi à l’espace de ta famille.</ThemedText>
          </View>
          <Arch size="sm" width={88} height={100} />
        </View>

        <Section style={{ marginTop: 18 }}>
          <List>
            <Field
              label="Courriel"
              testID="login-email"
              value={email}
              onChangeText={onChangeEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            <Field
              label="Mot de passe"
              testID="login-password"
              value={password}
              onChangeText={onChangePassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          </List>
          <SectionFooter>
            {'Mot de passe oublié ? '}
            <ThemedText variant="foot" color="tintText" accessibilityRole="link" accessibilityLabel="Recevoir un lien" onPress={onForgot}>
              Recevoir un lien
            </ThemedText>
          </SectionFooter>
          {error ? (
            <View accessibilityRole="alert" style={{ paddingTop: 10, paddingHorizontal: 16 }}>
              <ThemedText testID="login-error" variant="sub" color="sysRed">{error}</ThemedText>
            </View>
          ) : null}
        </Section>

        <Section style={{ marginTop: 28 }}>
          <Button label={loading ? 'Connexion...' : 'Se connecter'} onPress={onSubmit} disabled={loading} testID="login-submit" />
        </Section>

        <Section style={{ marginTop: 14 }}>
          <List>
            <ListRow leading={<RoundBadge glyph="shieldCheck" />} leadingInset={60} title="Double authentification" subtitle="Code à 6 chiffres demandé si activée" />
          </List>
        </Section>

        {onRegister ? (
          <Section style={{ marginTop: 14, alignItems: 'center' }}>
            <Button variant="plain" size="md" label="Pas encore de compte ? Créer un compte" onPress={onRegister} />
          </Section>
        ) : null}
      </ScrollView>
      <NavBar left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={onBack} />} />
    </KeyboardAvoidingView>
  );
}
