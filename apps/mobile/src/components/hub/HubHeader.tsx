import { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_LOGO, Icon, List, ListRow, Sheet } from '../../design';
import { IconBtn, Tap, WIcon, WText, useWeb } from '../../design/web';
import { useAuthStore } from '../../stores/auth.store';
import { ageFromDob, useChildStore, useSelectedChild } from '../../stores/child.store';
import { notifWebPath, openNotificationTarget, timeAgo, useHub, type HubNotif } from './HubProvider';
import { Popover } from './Popover';

/** Hauteur de la barre (hors zone sûre) : 12 + 44 + 12. */
export const HUB_HEADER_ROW = 68;

/** Tranche d'âge du sélecteur web (`ageGroupFromBirthDate`). */
function ageGroup(dob: string | null): string | null {
  const a = ageFromDob(dob);
  if (a === null) return null;
  if (a <= 11) return '8-11';
  if (a <= 14) return '12-14';
  return '15-17';
}

/**
 * En-tête de l'espace parent, allégé :
 *   gauche — logo THRIVE puis la pastille de l'enfant (initiale · prénom · âge · ⌄), qui ouvre la feuille iOS ;
 *   droite — Notifications (panneau déroulant) et les initiales, qui ouvrent directement les Paramètres du compte.
 * La messagerie vit dans le rond en bas à droite ; le choix clair / sombre dans les Paramètres du compte.
 */
export function HubHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const w = useWeb();
  const user = useAuthStore((s) => s.user);
  const { children, isLoading, loaded, selectChild } = useChildStore();
  const selected = useSelectedChild();
  const { notifications, unreadNotifications, markRead } = useHub();
  const [childSheet, setChildSheet] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);

  const top = insets.top + HUB_HEADER_ROW - 6;
  const age = ageFromDob(selected?.date_of_birth);
  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || '·';

  const openNotif = (n: HubNotif) => {
    setNotifsOpen(false);
    if (!n.is_read) void markRead([n.id]);
    // Laisser le panneau se refermer avant d'ouvrir la page (un questionnaire s'ouvre dans une feuille Safari).
    setTimeout(() => openNotificationTarget(router, notifWebPath(n)), 320);
  };

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: w.bg }}>
      <View style={{ height: HUB_HEADER_ROW, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => router.navigate('/(parent)/maison')} accessibilityRole="button" accessibilityLabel="Accueil THRIVE" hitSlop={6}>
          <Image source={BRAND_LOGO} accessibilityIgnoresInvertColors style={{ width: 32, height: 32, borderRadius: 7 }} />
        </Pressable>

        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row' }}>
          {isLoading && !loaded ? (
            <View style={{ height: 36, width: 132, borderRadius: 18, backgroundColor: w.chip }} />
          ) : children.length === 0 ? (
            <Tap
              onPress={() => router.push('/(parent)/children')}
              accessibilityRole="button"
              accessibilityLabel="Ajouter un enfant"
              style={{ height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: w.accent, justifyContent: 'center' }}
            >
              <WText size={14} weight={700} color="#022539" lh={18} numberOfLines={1}>
                + Ajouter un enfant
              </WText>
            </Tap>
          ) : (
            <Tap
              onPress={() => setChildSheet(true)}
              accessibilityRole="button"
              accessibilityLabel={`Enfant : ${selected?.first_name ?? ''}${age != null ? `, ${age} ans` : ''}. Changer d’enfant`}
              style={{
                flexShrink: 1, minWidth: 0, height: 40, paddingLeft: 4, paddingRight: 12, borderRadius: 20,
                backgroundColor: w.chip, borderWidth: 1, borderColor: w.line, flexDirection: 'row', alignItems: 'center', gap: 8,
              }}
            >
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: w.sage, alignItems: 'center', justifyContent: 'center' }}>
                <WText size={13} weight={700} color="#06222A" lh={16}>
                  {(selected?.first_name?.[0] ?? '·').toUpperCase()}
                </WText>
              </View>
              <WText size={15} weight={600} tone="ink" lh={18} numberOfLines={1} style={{ flexShrink: 1 }}>
                {selected?.first_name ?? ''}
                {age != null ? (
                  <WText size={13} weight={500} tone="soft" lh={18}>
                    {` · ${age} ans`}
                  </WText>
                ) : null}
              </WText>
              <WIcon name="chevron-down" size={15} color={w.text3} strokeWidth={2.2} />
            </Tap>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconBtn
            icon="bell"
            label={unreadNotifications ? `Notifications — ${unreadNotifications} non lue(s)` : 'Notifications'}
            onPress={() => setNotifsOpen((o) => !o)}
            badge={unreadNotifications}
          />
          <Tap
            onPress={() => router.push('/(parent)/profile')}
            accessibilityRole="button"
            accessibilityLabel="Paramètres du compte"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#0E6593', alignItems: 'center', justifyContent: 'center' }}
          >
            <WText size={13} weight={700} color="#FFFFFF" lh={16}>
              {initials}
            </WText>
          </Tap>
        </View>
      </View>

      {/* Choix de l'enfant : feuille iOS qui glisse du bas (l'animation Apple gardée de l'app). */}
      <Sheet visible={childSheet} onClose={() => setChildSheet(false)} title="Pour quel enfant ?">
        <List>
          {children.map((c) => (
            <ListRow
              key={c.id}
              title={c.first_name}
              subtitle={ageGroup(c.date_of_birth) ? `${ageGroup(c.date_of_birth)} ans` : undefined}
              chevron={false}
              accessory={c.id === selected?.id ? <Icon name="check" size={20} color={w.accentInk} strokeWidth={2.6} /> : undefined}
              onPress={() => {
                selectChild(c.id);
                setChildSheet(false);
              }}
            />
          ))}
        </List>
        <View style={{ height: 12 }} />
        <List>
          <ListRow
            glyph="people"
            title="Gérer mes enfants"
            onPress={() => {
              setChildSheet(false);
              router.push('/(parent)/children');
            }}
          />
        </List>
      </Sheet>

      {/* Notifications : le panneau déroulant de la cloche du web. */}
      <Popover visible={notifsOpen} onClose={() => setNotifsOpen(false)} top={top} left={12} right={12} accessibilityLabel="Notifications" style={{ maxHeight: 520 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <WText size={12} weight={700} tracking={0.12} upper tone="faint">
            Notifications
          </WText>
          {unreadNotifications > 0 ? (
            <Pressable
              onPress={() => markRead(notifications.filter((n) => !n.is_read).map((n) => n.id))}
              accessibilityRole="button"
              hitSlop={10}
              style={{ minHeight: 32, justifyContent: 'center' }}
            >
              <WText size={12} weight={600} tone="accent">
                Tout marquer lu
              </WText>
            </Pressable>
          ) : null}
        </View>
        {notifications.length === 0 ? (
          <WText size={14} tone="faint" style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            Aucune notification pour le moment.
          </WText>
        ) : (
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 8 }}>
            {notifications.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => openNotif(n)}
                accessibilityRole="button"
                accessibilityLabel={`${n.is_read ? '' : 'Non lue : '}${n.title}`}
                style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 12, minHeight: 56, flexDirection: 'row', gap: 10, backgroundColor: pressed ? w.surfaceSub : 'transparent' })}
              >
                <View style={{ marginTop: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: n.is_read ? 'transparent' : w.accent }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <WText size={14} weight={n.is_read ? 500 : 600} tone={n.is_read ? 'body' : 'ink'} numberOfLines={1}>
                    {n.title}
                  </WText>
                  {n.body ? (
                    <WText size={12} tone="soft" numberOfLines={2}>
                      {n.body}
                    </WText>
                  ) : null}
                  <WText size={11} tone="faint" style={{ marginTop: 2 }}>
                    {timeAgo(n.created_at)}
                  </WText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <Pressable
          onPress={() => {
            setNotifsOpen(false);
            router.push('/(parent)/notifications');
          }}
          accessibilityRole="button"
          style={({ pressed }) => ({ borderTopWidth: 1, borderTopColor: w.line, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? w.surfaceSub : 'transparent' })}
        >
          <WText size={13} weight={600} tone="accent">
            Toutes les notifications
          </WText>
        </Pressable>
      </Popover>
    </View>
  );
}
