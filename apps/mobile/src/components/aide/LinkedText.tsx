import { Linking, Text } from 'react-native';
import { ThemedText, useTheme, type ThemedTextProps } from '../../design';
import { linkify, smsUrl, telUrl } from './logic';

type Props = Omit<ThemedTextProps, 'children'> & { text: string };

/**
 * Un texte de PAGE_CONSULTER dont chaque numéro est appelable (tel:) ou textable (sms:), comme sur la page web.
 * Le texte reste intact : seuls les numéros reconnus deviennent des liens.
 */
export function LinkedText({ text, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <ThemedText {...rest}>
      {linkify(text).map((s, i) =>
        s.kind === 'text' ? (
          <Text key={i}>{s.text}</Text>
        ) : (
          <Text
            key={i}
            accessibilityRole="link"
            accessibilityLabel={`${s.kind === 'sms' ? 'Écrire au' : 'Appeler le'} ${s.text}`}
            onPress={() => Linking.openURL(s.kind === 'sms' ? smsUrl(s.value) : telUrl(s.value))}
            style={{ color: colors.tintText, fontWeight: '600', textDecorationLine: 'underline' }}
          >
            {s.text}
          </Text>
        ),
      )}
    </ThemedText>
  );
}
