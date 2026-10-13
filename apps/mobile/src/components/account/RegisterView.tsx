import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button, Field, GlassButton, GlassSurface, Icon, Lamp, List, ListRow, NavBar, ProgressBar, Section, SectionFooter, SectionHeader,
  ThemedText, useNavBarHeight, useTheme,
} from '../../design';

export type RegisterViewProps = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  onChangeFirstName: (v: string) => void;
  onChangeLastName: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onChangePassword: (v: string) => void;
  /** Longueur minimale du mot de passe (règle du serveur). */
  passwordMin: number;
  /** Texte d'aide sous le mot de passe quand la complexité manque (longueur déjà atteinte). */
  passwordRuleHint?: string | null;
  /** « Recevoir les nouveautés » : préférence locale, jamais envoyée (aucune donnée n'existe côté serveur). */
  newsletter: boolean;
  onChangeNewsletter: (v: boolean) => void;
  /** Consentement Loi 25 (âge, autorité parentale, conditions) : conservé de l'inscription existante. */
  accepted: boolean;
  onChangeAccepted: (v: boolean) => void;
  onOpenTerms: () => void;
  onOpenPrivacy?: () => void;
  error?: string;
  loading?: boolean;
  /** Champs remplis et mot de passe valide : sinon « Continuer » reste inactif. */
  canContinue: boolean;
  onContinue: () => void;
  onClose: () => void;
};

/**
 * Maquette C · Inscription, le parent (étape 1 sur 2) : barre de progression, sections Parent / Connexion, aide du mot de
 * passe, rangée « nouveautés », bouton Continuer en barre de verre (inactif tant que le formulaire est invalide).
 */
export function RegisterView(p: RegisterViewProps) {
  const { colors } = useTheme();
  const navH = useNavBarHeight();
  const insets = useSafeAreaInsets();
  const missing = Math.max(0, p.passwordMin - p.password.length);
  const hint = missing > 0 ? `${p.passwordMin} caractères minimum — encore ${missing}.` : p.passwordRuleHint ?? null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgGrouped }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Lamp />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: navH + 8, paddingBottom: 140 }}>
        <Section>
          <ProgressBar value={0.5} accessibilityLabel="Étape 1 sur 2" valueText="1 sur 2" />
        </Section>
        <View style={{ marginTop: 22, paddingHorizontal: 16 }}>
          <ThemedText variant="title2" accessibilityRole="header">D’abord, toi</ThemedText>
          <ThemedText variant="sub" color="label2" style={{ marginTop: 4 }}>
            Deux minutes. Pas de courriel de confirmation à aller chercher : tu entres tout de suite.
          </ThemedText>
        </View>

        <SectionHeader small title="Parent" />
        <Section>
          <List>
            <Field label="Prénom" value={p.firstName} onChangeText={p.onChangeFirstName} autoComplete="given-name" textContentType="givenName" returnKeyType="next" />
            <Field label="Nom" value={p.lastName} onChangeText={p.onChangeLastName} autoComplete="family-name" textContentType="familyName" returnKeyType="next" />
          </List>
        </Section>

        <SectionHeader small title="Connexion" />
        <Section>
          <List>
            <Field
              label="Courriel" value={p.email} onChangeText={p.onChangeEmail} autoCapitalize="none" autoCorrect={false}
              keyboardType="email-address" autoComplete="email" textContentType="emailAddress" returnKeyType="next"
            />
            <Field
              label="Mot de passe" value={p.password} onChangeText={p.onChangePassword} secureTextEntry
              autoComplete="new-password" textContentType="newPassword" returnKeyType="done"
            />
          </List>
          {hint ? (
            <View style={{ paddingTop: 7, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="info" size={15} color={colors.warn} />
              <ThemedText variant="foot" color="label2" style={{ flex: 1 }}>{hint}</ThemedText>
            </View>
          ) : (
            <SectionFooter>{`${p.passwordMin} caractères minimum.`}</SectionFooter>
          )}
        </Section>

        <Section style={{ marginTop: 20 }}>
          <List>
            <ListRow
              title="Recevoir les nouveautés"
              subtitle="Une fois par mois, au plus."
              toggle={{ value: p.newsletter, onChange: p.onChangeNewsletter }}
            />
          </List>
        </Section>

        <Section style={{ marginTop: 14 }}>
          <Pressable
            onPress={() => p.onChangeAccepted(!p.accepted)}
            accessibilityRole="checkbox"
            accessibilityLabel="Je confirme avoir 18 ans ou plus, être parent ou tuteur légal, et accepter les conditions"
            accessibilityState={{ checked: p.accepted }}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44, paddingHorizontal: 16, paddingVertical: 4 }}
          >
            <View
              style={{
                width: 24, height: 24, borderRadius: 7, marginTop: 1, alignItems: 'center', justifyContent: 'center',
                backgroundColor: p.accepted ? colors.tint : 'transparent',
                borderWidth: p.accepted ? 0 : 2, borderColor: colors.label3,
              }}
            >
              {p.accepted ? <Icon name="check" size={16} color={colors.tintInk} strokeWidth={3} /> : null}
            </View>
            <ThemedText variant="foot" color="label2" style={{ flex: 1 }}>
              J’ai 18 ans ou plus, je suis parent ou tuteur légal, et j’accepte les{' '}
              <ThemedText variant="foot" color="tintText" style={{ textDecorationLine: 'underline' }} accessibilityRole="link" onPress={p.onOpenTerms}>
                conditions d’utilisation
              </ThemedText>
              {p.onOpenPrivacy ? (
                <>
                  {' '}et la{' '}
                  <ThemedText variant="foot" color="tintText" style={{ textDecorationLine: 'underline' }} accessibilityRole="link" onPress={p.onOpenPrivacy}>
                    politique de confidentialité
                  </ThemedText>
                </>
              ) : null}
              .
            </ThemedText>
          </Pressable>
          {p.error ? (
            <View accessibilityRole="alert" style={{ paddingTop: 10, paddingHorizontal: 16 }}>
              <ThemedText testID="register-error" variant="sub" color="sysRed">{p.error}</ThemedText>
            </View>
          ) : null}
        </Section>
      </ScrollView>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 16) }}>
        <GlassSurface radius={30} style={{ padding: 6 }}>
          <Button
            label={p.loading ? 'Création...' : 'Continuer'}
            onPress={p.onContinue}
            disabled={!p.canContinue || p.loading}
            testID="register-continue"
          />
        </GlassSurface>
      </View>

      <NavBar
        title="Créer le compte"
        left={<GlassButton glyph="close" accessibilityLabel="Fermer" onPress={p.onClose} />}
        right={<ThemedText variant="sub" color="label2">1 sur 2</ThemedText>}
      />
    </KeyboardAvoidingView>
  );
}
