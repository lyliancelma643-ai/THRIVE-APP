import { ScrollView, TextInput, View } from 'react-native';
import { Button, Sheet, ThemedText, resolveTextStyle, useTheme } from '../../design';
import type { P3Activity } from '../../lib/p3';

type Props = {
  visible: boolean;
  onClose: () => void;
  label: string;
  kind: NonNullable<P3Activity['capture']>['kind'];
  items: string[];
  text: string;
  onItems: (items: string[]) => void;
  onText: (text: string) => void;
};

/** M14 · Noter (feuille « À garder ») : trois forces, ou une phrase libre. Rien n'est exigé. */
export function KeptSheet({ visible, onClose, label, kind, items, text, onItems, onText }: Props) {
  const { colors, fontsLoaded } = useTheme();
  const input = [
    resolveTextStyle('body', fontsLoaded),
    { padding: 14, borderRadius: 20, color: colors.label, backgroundColor: colors.fill4, borderWidth: 1, borderColor: colors.separator },
  ] as const;
  return (
    <Sheet visible={visible} onClose={onClose} title="À garder" detent="large" scroll={false} dim={0.46}>
      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 8, paddingBottom: 28 }}>
        <ThemedText variant="body" style={{ marginTop: 4, fontSize: 18, lineHeight: 26 }}>{label}</ThemedText>
        {kind === 'forces' ? (
          <View style={{ marginTop: 16, gap: 10 }}>
            {items.map((v, i) => (
              <TextInput
                key={i}
                value={v}
                onChangeText={(t) => onItems(items.map((x, j) => (j === i ? t : x)))}
                maxLength={140}
                accessibilityLabel={`Force ${i + 1}`}
                placeholder={`${i + 1}.`}
                placeholderTextColor={colors.label3}
                selectionColor={colors.tintText}
                style={[...input, { minHeight: 48 }]}
              />
            ))}
          </View>
        ) : (
          <TextInput
            value={text}
            onChangeText={onText}
            multiline
            maxLength={500}
            autoFocus
            accessibilityLabel={label}
            placeholderTextColor={colors.label3}
            selectionColor={colors.tintText}
            style={[...input, { marginTop: 16, minHeight: 116, textAlignVertical: 'top' }]}
          />
        )}
        <View style={{ marginTop: 22 }}>
          <Button variant="accent" label="C’est noté" onPress={onClose} />
        </View>
      </ScrollView>
    </Sheet>
  );
}
