import { useId } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import {
  Button, Field, GlassButton, List, ListRow, MascotMedallion, NavBar, Section, SectionFooter, ThemedText, useNavBarHeight,
  useTheme, withAlpha,
} from '../../design';

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

/** Halo soleil et anneaux blancs du médaillon de connexion en Nuit calme (la primitive les omet en Nuit calme). */
function NuitGlow({ size }: { size: number }) {
  const { colors } = useTheme();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pad = Math.ceil(size * 0.14);
  const box = size + pad * 2;
  const c = box / 2;
  return (
    <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} style={{ position: 'absolute', left: -pad, top: -pad }} pointerEvents="none">
      <Defs>
        <RadialGradient id={`g${uid}`} cx="50%" cy="50%" r="70.71%">
          <Stop offset="0" stopColor={colors.sun} stopOpacity={0.18} />
          <Stop offset="0.68" stopColor={colors.sun} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={size * 0.64} fill={`url(#g${uid})`} />
      <Circle cx={c} cy={c} r={size / 2 + 4} fill="rgba(255,255,255,0.10)" />
      <Circle cx={c} cy={c} r={size / 2 + 0.5} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1} />
    </Svg>
  );
}

/**
 * Maquette B · Connexion : retour, titre + médaillon 112, liste Courriel / Mot de passe, lien « Recevoir un lien »,
 * bouton prom, rangée « Double authentification » (information). Identique dans les trois styles (halo et titre
 * Fraunces par style). Les testID de connexion (login-*) servent aux flux e2e.
 */
export function LoginView({
  email, password, onChangeEmail, onChangePassword, error, loading, onSubmit, onBack, onForgot, onRegister,
}: LoginViewProps) {
  const { style, colors } = useTheme();
  const navH = useNavBarHeight();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgGrouped }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: navH + 12, paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="title1" accessibilityRole="header">Content de te revoir</ThemedText>
            <ThemedText variant="body" color="label2" style={{ marginTop: 6 }}>Connecte-toi à l’espace de ta famille.</ThemedText>
          </View>
          <View style={{ width: 112, height: 112 }}>
            {style === 'nuit' ? <NuitGlow size={112} /> : null}
            <MascotMedallion size={112} />
          </View>
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
            <ListRow glyph="shieldCheck" iconColor="sysGreen" title="Double authentification" subtitle="Code à 6 chiffres demandé si activée" />
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
