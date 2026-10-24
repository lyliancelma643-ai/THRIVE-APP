import { ActivityIndicator, View } from 'react-native';
import {
  Button,
  Card,
  List,
  ListRow,
  ProgressBar,
  Section,
  SectionFooter,
  Tag,
  ThemedText,
  useTheme,
} from '../../design';
import { IconBadge, Packshot } from '../offres/parts';
import type { SubscriptionModel } from './subscriptionModel';

export type SubscriptionViewProps = {
  model: SubscriptionModel;
  /** « l’App Store » / « Google Play ». */
  storeName: string;
  /** « Sur cet iPhone » / « Sur ce téléphone ». */
  deviceLabel: string;
  /** Intitulé « Abonnement » au-dessus de la carte (réglages du profil). */
  embedded?: boolean;
  restoring?: boolean;
  onManage: () => void;
  onRestore: () => void;
  onDiscover: () => void;
};

/**
 * X2 · Mon abonnement (Maison). Vue pure : l'état (programme inclus / essai / actif / offert / aucun) est déjà traduit
 * en texte par `buildSubscriptionModel`. Anti-steering : payé ailleurs = message neutre, aucun lien ; aucune mention de
 * Stripe côté Maison : un accès venant d'un pack affiche « Inclus avec ton programme · aucun abonnement séparé » (D2).
 */
export function SubscriptionView({ model, storeName, deviceLabel, embedded, restoring, onManage, onRestore, onDiscover }: SubscriptionViewProps) {
  const { colors } = useTheme();
  const m = model;
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16, gap: 12 }}>
      {embedded ? <ThemedText variant="title3" accessibilityRole="header">Abonnement</ThemedText> : null}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Packshot id="ACT-0603" size={56} radius={16} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="title3">THRIVE Maison</ThemedText>
            <ThemedText variant="sub" color="label2">{m.status}</ThemedText>
          </View>
          {m.tag ? <Tag label={m.tag.label} tone={m.tag.tone} style={{ alignSelf: 'center' }} /> : null}
        </View>
        {m.detail ? (
          <>
            <View style={{ height: 0.5, backgroundColor: colors.separator, marginVertical: 14 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <ThemedText variant="sub" color="label2">{m.detail.label}</ThemedText>
              <ThemedText variant="sub" weight={600} style={{ flexShrink: 1, textAlign: 'right' }}>{m.detail.value}</ThemedText>
            </View>
            {typeof m.detail.progress === 'number' ? (
              <ProgressBar value={m.detail.progress} accessibilityLabel="Avancement de l’essai" style={{ marginTop: 8 }} />
            ) : null}
          </>
        ) : null}
        {m.note ? <ThemedText variant="foot" color="label2" style={{ marginTop: 8 }}>{m.note}</ThemedText> : null}
      </Card>

      {m.shared ? (
        <List>
          <ListRow leading={<IconBadge glyph="people" />} leadingInset={60} title="Partagé avec ton co-parent" subtitle="Un seul accès pour la famille" />
          {m.storeRow ? (
            <ListRow
              leading={<IconBadge glyph="phone" />}
              leadingInset={60}
              title={`Payé via ${storeName}`}
              subtitle={deviceLabel}
            />
          ) : null}
          {m.programRow ? (
            <ListRow
              leading={<IconBadge glyph="tray" />}
              leadingInset={60}
              title="Payé avec ton programme"
              subtitle="Inclus avec ton programme · aucun abonnement séparé"
            />
          ) : null}
        </List>
      ) : null}

      {m.externalNote ? <ThemedText variant="sub" color="label2">Ton abonnement est actif sur ce compte.</ThemedText> : null}

      {m.manage ? (
        <List>
          <ListRow
            leading={<IconBadge glyph="settings" />}
            leadingInset={60}
            title={`Gérer dans ${storeName}`}
            subtitle="Changer de formule ou résilier l’abonnement"
            onPress={onManage}
          />
          <ListRow
            leading={<IconBadge glyph="restore" />}
            leadingInset={60}
            title="Restaurer les achats"
            accessory={restoring ? <ActivityIndicator color={colors.sageText} /> : undefined}
            chevron={false}
            onPress={restoring ? undefined : onRestore}
          />
        </List>
      ) : null}

      {m.discover ? <Button size="md" variant="gray" label="Découvrir l’abonnement" onPress={onDiscover} /> : null}

      <Section style={{ marginHorizontal: 0 }}>
        <SectionFooter style={{ paddingTop: 0 }}>
          Déjà abonné ailleurs ? Connecte-toi avec la même adresse : ton accès est reconnu partout.
        </SectionFooter>
      </Section>
    </View>
  );
}
