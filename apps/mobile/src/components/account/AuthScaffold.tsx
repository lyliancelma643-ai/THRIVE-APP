import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, type TextInputProps } from 'react-native';
import { BRAND_LOGO, SPACING, ThemedText, useTheme } from '../../design';

/** Fond + clavier + défilement communs aux écrans d'arrivée. */
export function AuthScaffold({ children, logo = true }: { children: ReactNode; logo?: boolean }) {
  const { colors } = useTheme();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgGrouped }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: SPACING.space6, paddingVertical: SPACING.space8 }}
      >
        {logo ? (
          <Image
            source={BRAND_LOGO}
            accessibilityIgnoresInvertColors
            accessible={false}
            style={{ width: 52, height: 52, borderRadius: 12, marginBottom: SPACING.space5 }}
          />
        ) : null}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Champ de saisie thémé (≥ 44 pt). L'étiquette d'accessibilité reprend le placeholder. */
export function AuthField(props: TextInputProps & { label: string }) {
  const { colors, radius } = useTheme();
  const { label, style, ...rest } = props;
  return (
    <TextInput
      accessibilityLabel={label}
      placeholder={label}
      placeholderTextColor={colors.label2}
      selectionColor={colors.tint}
      {...rest}
      style={[
        {
          minHeight: 52, borderRadius: radius.card, paddingHorizontal: SPACING.space4, marginBottom: SPACING.space3,
          backgroundColor: colors.bgGrouped2, color: colors.label, fontSize: 17,
        },
        style,
      ]}
    />
  );
}

/** Bouton principal plein (teinte du style). */
export function AuthButton({ label, onPress, disabled, testID }: { label: string; onPress: () => void; disabled?: boolean; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        minHeight: 52, borderRadius: 9999, alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.tint, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, marginBottom: SPACING.space3,
      })}
    >
      <ThemedText variant="headline" style={{ color: colors.tintInk }}>{label}</ThemedText>
    </Pressable>
  );
}

/** Lien texte secondaire (≥ 44 pt). */
export function AuthLink({ children, onPress, label }: { children: ReactNode; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={label} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </Pressable>
  );
}

export function AuthError({ message, testID }: { message: string; testID?: string }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={{ marginBottom: SPACING.space3 }}>
      <ThemedText testID={testID} variant="subheadline" color="sysRed">{message}</ThemedText>
    </View>
  );
}
