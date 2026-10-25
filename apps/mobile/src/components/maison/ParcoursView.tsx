import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  CANVAS, Field, GlassButton, Icon, Lamp, LargeTitle, NavBar, Tag, ThemedText, VignetteImage, useLargeTitle, useNavBarHeight, useTheme,
} from '../../design';
import { POSTER_BG } from './palette';
import type { ParcoursVM, PosterVM } from './viewModels';
import { useWindowDimensions } from '../../design/layout';

type Props = {
  vm: ParcoursVM;
  onBack: () => void;
  onOpen: (id: string) => void;
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Cellule du parcours : vignette 114 pt (coche sauge si vécue, grisée si semaine pas ouverte), titre 13/16, durées 12/16. */
function Cell({ poster, size, onPress }: { poster: PosterVM; size: number; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={poster.locked}
      accessibilityRole="button"
      accessibilityLabel={`${poster.title}, ${poster.durations}${poster.locked ? ', pas encore ouverte' : poster.done ? ', déjà vécue' : ''}`}
      style={({ pressed }) => ({ width: size, gap: 6, opacity: pressed ? 0.75 : 1 })}
    >
      <View style={{ width: size, height: size, borderRadius: 20, overflow: 'hidden', backgroundColor: POSTER_BG, borderWidth: 1, borderColor: colors.separator }}>
        <VignetteImage
          id={poster.vignetteId}
          style={[{ width: size, height: size }, poster.locked ? ({ opacity: 0.55, filter: 'grayscale(1)' } as object) : null]}
        />
        {poster.done && !poster.locked ? (
          <View
            style={{
              position: 'absolute', right: 4, bottom: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.sage,
              alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: CANVAS.white,
            } as object}
          >
            <Icon name="check" size={13} color={colors.navy900} strokeWidth={3} />
          </View>
        ) : null}
      </View>
      <ThemedText variant="foot" weight={600} style={{ lineHeight: 16 }}>{poster.title}</ThemedText>
      <ThemedText variant="cap" color="label2">{poster.durations}</ThemedText>
    </Pressable>
  );
}

/**
 * K2 · Tout le parcours : les 13 semaines et leurs activités, avec vignette. Faites, en cours, à venir (verrou neutre).
 * Vue présentationnelle ; la recherche (loupe de la barre) filtre les titres localement.
 */
export function ParcoursView({ vm, onBack, onOpen }: Props) {
  const { width } = useWindowDimensions();
  const navH = useNavBarHeight();
  const { colors } = useTheme();
  const lt = useLargeTitle(40);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const col = Math.min(114, Math.floor((width - 32 - 24) / 3));
  const q = norm(query.trim());
  const match = (list: PosterVM[]) => (q ? list.filter((p) => norm(p.title).includes(q)) : list);

  const weeks = useMemo(
    () => vm.weeks.map((w) => ({ ...w, posters: match(w.posters) })).filter((w) => !q || w.posters.length > 0),
    [vm.weeks, q],
  );

  const grid = (list: PosterVM[], gapY: number) => (
    <View style={{ marginHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: gapY }}>
      {list.map((p) => (
        <View key={p.id} style={{ width: (width - 32 - 24) / 3 }}>
          <Cell poster={p} size={col} onPress={() => onOpen(p.id)} />
        </View>
      ))}
    </View>
  );

  const head = (title: string, right?: React.ReactNode) => (
    <View style={{ paddingTop: 26, paddingBottom: 8, paddingHorizontal: 4, marginHorizontal: 16, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
      <ThemedText variant="sectionTitle" accessibilityRole="header" style={{ flex: 1, fontSize: 20, lineHeight: 25 }}>{title}</ThemedText>
      {right}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <Lamp />
      <ScrollView
        onScroll={lt.onScroll}
        scrollEventThrottle={lt.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: navH, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <LargeTitle subtitle={vm.subtitle}>{vm.title}</LargeTitle>

        {searching && !vm.flat ? (
          <View style={{ marginHorizontal: 16, marginTop: 14 }}>
            <Field label="Rechercher" value={query} onChangeText={setQuery} placeholder="Un titre d’activité" autoCorrect={false} />
          </View>
        ) : null}

        {vm.flat ? (
          <View style={{ marginTop: 18 }}>{grid(vm.flat, 16)}</View>
        ) : (
          <>
            {weeks.map((w) => (
              <View key={w.week}>
                {head(
                  `Semaine ${w.week} · ${w.title}`,
                  w.state === 'faite' ? (
                    <Tag tone="ok" glyph="check" label="Faite" style={{ marginTop: 3 }} />
                  ) : w.state === 'en_cours' ? (
                    <Tag label="En cours" style={{ marginTop: 3 }} />
                  ) : (
                    <View accessible accessibilityLabel="Pas encore ouverte">
                      <Icon name="lock" size={16} color={colors.label3} />
                    </View>
                  ),
                )}
                {grid(w.posters, 16)}
              </View>
            ))}
            {match(vm.bonus).length > 0 ? (
              <View>
                {head('Bonus · en famille')}
                {grid(match(vm.bonus), 12)}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      <NavBar
        edge={lt.edge}
        title={vm.title}
        titleVisible={lt.titleVisible}
        left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={onBack} />}
        right={
          vm.flat ? undefined : (
            <GlassButton
              glyph={searching ? 'close' : 'search'}
              accessibilityLabel={searching ? 'Fermer la recherche' : 'Rechercher une activité'}
              onPress={() => { setSearching((s) => !s); setQuery(''); }}
            />
          )
        }
      />
    </View>
  );
}
