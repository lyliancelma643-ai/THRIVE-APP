import { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_LOGO, Icon, List, ListRow, Sheet, useTheme } from '../../design';
import { IconBtn, Tap, WIcon, WText, useWeb } from '../../design/web';
import { useAuthStore } from '../../stores/auth.store';
import { ageFromDob, useChildStore, useSelectedChild } from '../../stores/child.store';
import { mobileTargetForPath } from '../bilan/notificationRoute';
import { notifWebPath, timeAgo, useHub, type HubNotif } from './HubProvider';
import { Popover } from './Popover';

const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_URL || 'https://app.thrivesportpositive.com';

/** Hauteur de la barre (hors zone sûre) : 12 + 44 + 12. */
export const HUB_HEADER_ROW = 68;

const ROLE_LABELS: Record<string, string> = { PARENT: 'Parent', ADMIN: 'Administrateur', SUPER_ADMIN: 'Super admin', COACH: 'Coach' };

/** Tranche d'âge du sélecteur web (`ageGroupFromBirthDate`). */
function ageGroup(dob: string | null): string | null {
  const a = ageFromDob(dob);
  if (a === null) return null;
  if (a <= 11) return '8-11';
  if (a <= 14) return '12-14';
  return '15-17';
}

/**
 * En-tête de l'espace parent, copie de celui du web (app/parent/(hub)/layout.tsx), à même le fond :
 *   gauche — logo THRIVE puis « Léo · 12 ans ⌄ » (feuille iOS pour changer d'enfant) ;
 *   droite — Messagerie (non-lus), Notifications (panneau déroulant), Ambiance soleil/lune, Compte (menu).
 */
export function HubHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const w = useWeb();
  const { styleKey, setStyle } = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { children, isLoading, loaded, selectChild } = useChildStore();
  const selected = useSelectedChild();
  const { notifications, unreadNotifications, unreadMessages, markRead } = useHub();
  const [childSheet, setChildSheet] = useState(false);
  const [menu, setMenu] = useState<null | 'notifs' | 'user'>(null);
  const [signingOut, setSigningOut] = useState(false);

  const top = insets.top + HUB_HEADER_ROW - 6;
  const age = ageFromDob(selected?.date_of_birth);
  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || '·';
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Mon compte';
  const isNight = styleKey === 'veillee';

  const go = (path: string) => {
    if (path.startsWith('/q/')) {
      void WebBrowser.openBrowserAsync(`${WEB_ORIGIN}${path}`);
      return;
    }
    const t = mobileTargetForPath(path);
    if (t) router.push({ pathname: t.pathname, params: t.params } as never);
  };

  const openNotif = async (n: HubNotif) => {
    setMenu(null);
    if (!n.is_read) void markRead([n.id]);
    go(notifWebPath(n));
  };

  const logout = async () => {
    setSigningOut(true);
    setMenu(null);
    useChildStore.getState().reset();
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: w.bg }}>
      <View style={{ height: HUB_HEADER_ROW, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => router.navigate('/(parent)/maison')}
            accessibilityRole="button"
            accessibilityLabel="Accueil THRIVE"
            hitSlop={6}
          >
            <Image source={BRAND_LOGO} accessibilityIgnoresInvertColors style={{ width: 32, height: 32, borderRadius: 7 }} />
          </Pressable>
          {isLoading && !loaded ? (
            <View style={{ height: 20, width: 112, borderRadius: 10, backgroundColor: w.chip }} />
          ) : children.length === 0 ? (
            <Tap
              onPress={() => router.push('/(parent)/children')}
              accessibilityRole="button"
              accessibilityLabel="Ajouter un enfant"
              style={{ height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: w.accent, justifyContent: 'center' }}
            >
              <WText size={14} weight={700} color="#022539" numberOfLines={1}>
                + Ajouter un enfant
              </WText>
            </Tap>
          ) : (
            <Pressable
              onPress={() => setChildSheet(true)}
              accessibilityRole="button"
              accessibilityLabel={`Enfant : ${selected?.first_name ?? ''}. Changer d’enfant`}
              hitSlop={4}
              style={({ pressed }) => ({ flexShrink: 1, minWidth: 0, height: 44, flexDirection: 'row', alignItems: 'center', gap: 2, opacity: pressed ? 0.6 : 1 })}
            >
              <WText size={13} weight={600} tone="soft" tracking={0.02} numberOfLines={1} style={{ flexShrink: 1 }}>
                {`${selected?.first_name ?? ''}${age != null ? ` · ${age} ans` : ''}`}
              </WText>
              <WIcon name="chevron-down" size={16} color={w.text3} />
            </Pressable>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <IconBtn
            icon="mail"
            label={unreadMessages ? `Messagerie — ${unreadMessages} message(s) non lu(s)` : 'Messagerie : coach et support THRIVE'}
            onPress={() => router.push('/(parent)/messages')}
            badge={unreadMessages}
          />
          <IconBtn
            icon="bell"
            label={unreadNotifications ? `Notifications — ${unreadNotifications} non lue(s)` : 'Notifications'}
            onPress={() => setMenu((m) => (m === 'notifs' ? null : 'notifs'))}
            badge={unreadNotifications}
          />
          <IconBtn
            label={isNight ? 'Passer à l’ambiance Jour clair' : 'Passer à l’ambiance Nuit calme'}
            onPress={() => setStyle(isNight ? 'lin' : 'veillee')}
            background={w.surfaceSub}
          >
            <WIcon name={isNight ? 'sun' : 'moon'} size={20} color={w.text2} strokeWidth={1.8} />
          </IconBtn>
          <Tap
            onPress={() => setMenu((m) => (m === 'user' ? null : 'user'))}
            accessibilityRole="button"
            accessibilityLabel="Menu du compte"
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
            title="+ Ajouter un enfant ou un parent"
            onPress={() => {
              setChildSheet(false);
              router.push('/(parent)/children');
            }}
          />
        </List>
      </Sheet>

      {/* Notifications : le panneau déroulant de la cloche du web. */}
      <Popover visible={menu === 'notifs'} onClose={() => setMenu(null)} top={top} left={12} right={12} width={undefined} accessibilityLabel="Notifications" style={{ maxHeight: 520 }}>
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
            setMenu(null);
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

      {/* Menu du compte : identité, abonnement, paramètres (la section Compte de l'app), déconnexion. */}
      <Popover visible={menu === 'user'} onClose={() => setMenu(null)} top={top} right={12} width={256} accessibilityLabel="Compte">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: w.line }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#0E6593', alignItems: 'center', justifyContent: 'center' }}>
            <WText size={13} weight={700} color="#FFFFFF" lh={16}>
              {initials}
            </WText>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <WText size={14} weight={600} tone="ink" numberOfLines={1}>
              {fullName}
            </WText>
            <WText size={12} tone="faint" numberOfLines={1}>
              {user?.email ?? ''}
            </WText>
            {user?.role ? (
              <View style={{ alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: w.chip }}>
                <WText size={10} weight={600} tone="soft" upper tracking={0.05} lh={14}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </WText>
              </View>
            ) : null}
          </View>
        </View>
        {[
          ...(user?.role === 'PARENT' || !user?.role ? [{ icon: 'star' as const, label: 'Mon abonnement', to: '/(parent)/abonnement' }] : []),
          { icon: 'settings' as const, label: 'Paramètres du compte', to: '/(parent)/profile' },
        ].map((it) => (
          <Pressable
            key={it.label}
            onPress={() => {
              setMenu(null);
              router.push(it.to as never);
            }}
            accessibilityRole="menuitem"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 48, backgroundColor: pressed ? w.chip : 'transparent' })}
          >
            <WIcon name={it.icon} size={20} color={w.text2} />
            <WText size={14} tone="body">
              {it.label}
            </WText>
          </Pressable>
        ))}
        <Pressable
          onPress={logout}
          disabled={signingOut}
          accessibilityRole="menuitem"
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 48,
            borderTopWidth: 1, borderTopColor: w.line, backgroundColor: pressed ? 'rgba(239,68,68,0.15)' : 'transparent', opacity: signingOut ? 0.6 : 1,
          })}
        >
          <WIcon name="power" size={20} color={w.dangerInk} />
          <WText size={14} weight={600} color={w.dangerInk}>
            {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
          </WText>
        </Pressable>
      </Popover>
    </View>
  );
}
