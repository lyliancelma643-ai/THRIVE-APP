import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CANVAS, Icon, ThemedText, VignetteImage, useTheme } from '../../design';
import { momentInk } from './palette';
import type { MomentVM } from './viewModels';
import { useWindowDimensions } from '../../design/layout';

type Props = {
  vm: MomentVM;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  /** « Il ne veut plus ? On arrête là, c’est compté. » : ouvre « C’est fait ? » (le moment compte quand même). */
  onStop: () => void;
};

const STROKE = 16;

/** Bouton rond en verre sombre (le moment est toujours une scène sombre, quel que soit le style). */
function DarkGlass({ size, onPress, label, disabled, children }: { size: number; onPress: () => void; label: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: momentInk(0.14), borderWidth: 1, borderColor: momentInk(0.12), opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

/**
 * @deprecated GO 4 : la route `moment/[activityId]` utilise désormais `components/activite/DerouleView` (flot pas à pas,
 * Veillée forcée). Conservé tel quel parce que la galerie DEV (`dev-gallery/lot-maison.tsx`) l'importe encore.
 *
 * M · Moment en cours : plein écran sombre, mascotte, minuteur en anneau, commandes en verre.
 * Le chiffre annoncé est toujours celui du minuteur. Vue présentationnelle (le temps vit dans la route).
 */
export function MomentView({ vm, onClose, onPrev, onNext, onToggle, onStop }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const ring = Math.min(270, Math.max(190, height - 600));
  const r = (ring - STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const top = insets.top + 54;

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy900 }}>
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: insets.top, left: 0, right: 0, height: 54, zIndex: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}
      >
        <DarkGlass size={44} onPress={onClose} label="Quitter le moment">
          <Icon name="close" size={21} color={CANVAS.white} />
        </DarkGlass>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
          <ThemedText variant="headline" numberOfLines={1} accessibilityRole="header" style={{ color: CANVAS.white, maxWidth: '55%' }}>{vm.title}</ThemedText>
        </View>
      </View>

      <View style={{ alignItems: 'center', paddingTop: top }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden', marginBottom: 10, backgroundColor: colors.bgGrouped3 }}>
          <VignetteImage id={vm.vignetteId} style={{ width: 64, height: 64 }} />
        </View>
        <ThemedText variant="sub" weight={600} style={{ fontSize: 13, lineHeight: 18, letterSpacing: 1, textTransform: 'uppercase', color: momentInk(0.7) }}>
          {`Étape ${vm.stepIndex + 1} sur ${vm.stepCount}`}
        </ThemedText>
        <ThemedText
          variant="title2"
          accessibilityLiveRegion="polite"
          style={{ marginTop: 8, paddingHorizontal: 32, textAlign: 'center', color: CANVAS.white }}
        >
          {vm.stepText}
        </ThemedText>

        <View
          style={{ width: ring, height: ring, marginTop: 26, alignItems: 'center', justifyContent: 'center' }}
          accessible
          accessibilityRole="timer"
          accessibilityLabel={vm.a11yTimer}
        >
          <Svg width={ring} height={ring} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={ring / 2} cy={ring / 2} r={r} stroke={momentInk(0.12)} strokeWidth={STROKE} fill="none" />
            <Circle
              cx={ring / 2} cy={ring / 2} r={r} stroke={colors.sun} strokeWidth={STROKE} fill="none" strokeLinecap="round"
              strokeDasharray={`${circ * Math.max(0.0001, vm.ratio)} ${circ}`}
            />
          </Svg>
          <ThemedText variant="numeralHero" style={{ color: CANVAS.white }}>{vm.clock}</ThemedText>
          <ThemedText variant="sub" style={{ marginTop: 6, color: momentInk(0.65) }}>{`sur ${vm.minutes} min`}</ThemedText>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 30 }}>
          {Array.from({ length: vm.stepCount }, (_, i) => (
            <View key={i} style={{ width: i === vm.stepIndex ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: i <= vm.stepIndex ? colors.sun : momentInk(0.25) }} />
          ))}
        </View>
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(0, insets.bottom - 34) + 120, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 22 }}>
        <DarkGlass size={64} onPress={onPrev} label="Étape précédente" disabled={vm.stepIndex === 0}>
          <Icon name="chevronLeft" size={26} color={CANVAS.white} />
        </DarkGlass>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={vm.running ? 'Mettre en pause' : 'Reprendre'}
          style={({ pressed }) => ({
            width: 86, height: 86, borderRadius: 43, backgroundColor: colors.sun, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1,
          })}
        >
          <Icon name={vm.running ? 'pause' : 'play'} size={34} color={colors.accentInk} />
        </Pressable>
        <DarkGlass size={64} onPress={onNext} label={vm.isLast ? 'Terminer le moment' : 'Étape suivante'}>
          <Icon name={vm.isLast ? 'check' : 'chevronRight'} size={26} color={CANVAS.white} />
        </DarkGlass>
      </View>

      <Pressable
        onPress={onStop}
        accessibilityRole="button"
        accessibilityLabel="Il ne veut plus. On arrête là, c’est compté."
        style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(0, insets.bottom - 34) + 48, minHeight: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
      >
        <Icon name="hand" size={16} color={momentInk(0.75)} />
        <ThemedText variant="sub" style={{ color: momentInk(0.75) }}>
          {'Il ne veut plus ? '}
          <ThemedText variant="sub" style={{ color: momentInk(0.75), textDecorationLine: 'underline' }}>On arrête là, c’est compté.</ThemedText>
        </ThemedText>
      </Pressable>
    </View>
  );
}
