import type { ReactNode, Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { resolveTextStyle } from './typography';
import { SPACING } from './tokens';

export type FieldProps = Pick<
  TextInputProps,
  | 'value' | 'onChangeText' | 'placeholder' | 'secureTextEntry' | 'keyboardType' | 'autoCapitalize' | 'autoComplete'
  | 'autoCorrect' | 'textContentType' | 'returnKeyType' | 'onSubmitEditing' | 'onBlur' | 'onFocus' | 'editable'
  | 'multiline' | 'maxLength' | 'testID' | 'inputMode'
> & {
  /** `.field label` : 17/22, colonne de 108 pt. */
  label: string;
  /** Contenu statique à la place de la saisie (`.in` en lecture seule : valeur, tag, menu). */
  children?: ReactNode;
  /** Largeur de la colonne du libellé (défaut 108). */
  labelWidth?: number;
  /** Élément à droite (œil du mot de passe, unité…). */
  right?: ReactNode;
  /** Masque le filet (dernier champ). Posé automatiquement par `<List>`. */
  last?: boolean;
  accessibilityLabel?: string;
  inputRef?: Ref<TextInput>;
};

/**
 * `.field` : ligne libellé + saisie dans une `<List>` (min 52 pt, padding 0 16, gap 12). Encapsule un
 * `TextInput` contrôlé : texte `label` 17/22, indice `label3`, curseur `tint`. Sans `children`, le champ est saisissable.
 */
export function Field({
  label, children, labelWidth = 108, right, last, accessibilityLabel, inputRef, placeholder, multiline, ...input
}: FieldProps) {
  const { colors, fontsLoaded, style } = useTheme();
  const text = resolveTextStyle('body', fontsLoaded, style);
  return (
    <View style={{ minHeight: SPACING.rowMin, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <ThemedText variant="body" style={{ width: labelWidth }}>{label}</ThemedText>
      {children !== undefined ? (
        <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
      ) : (
        <TextInput
          {...input}
          ref={inputRef}
          multiline={multiline}
          placeholder={placeholder}
          placeholderTextColor={colors.label3}
          selectionColor={colors.tint}
          cursorColor={colors.tint}
          accessibilityLabel={accessibilityLabel ?? label}
          style={[
            text,
            {
              flex: 1, minWidth: 0, color: colors.label, paddingVertical: 15, paddingHorizontal: 0,
              // Pas de contour de focus navigateur : le curseur `tint` suffit (aperçu web).
              outlineWidth: 0,
            },
          ]}
        />
      )}
      {right}
      {!last ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', bottom: 0, right: 0, left: 16, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }}
        />
      ) : null}
    </View>
  );
}
Field.isListItem = true;
