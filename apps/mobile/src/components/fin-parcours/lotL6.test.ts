import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Lot L6 (coach, séances, messages, vidéo, enfant, fin de parcours) : plus aucune trace des anciens styles,
// aucune adresse de paiement web, et le drapeau vidéo reste fermé.
const SRC = join(__dirname, '..', '..');
const FILES = [
  'app/(parent)/seances.tsx', 'app/(parent)/messages.tsx', 'app/(parent)/notifications.tsx', 'app/(parent)/dashboard.tsx',
  'app/(parent)/videos.tsx', 'app/(parent)/fin-de-parcours.tsx', 'app/(parent)/chat/[conversationId].tsx',
  ...['SeancesView', 'SessionReportView', 'ThreadView', 'MessagesListView', 'NotificationsView', 'Bubble'].map((n) => `components/bilan/${n}.tsx`),
  ...readdirSync(join(SRC, 'components/fin-parcours')).filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts')).map((f) => `components/fin-parcours/${f}`),
  ...readdirSync(join(SRC, 'components/video')).filter((f) => /\.tsx?$/.test(f)).map((f) => `components/video/${f}`),
  ...readdirSync(join(SRC, 'screens/child')).filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts')).map((f) => `screens/child/${f}`),
];

describe('lot L6', () => {
  it.each(FILES)('%s : ni ancien style ni compat ni lien de paiement', (f) => {
    const src = readFileSync(join(SRC, f), 'utf8');
    expect(src).not.toMatch(/natif|nuit|Nuit calme|Carnet de saison|carnet/);
    expect(src).not.toMatch(/useTheme\(\)\.style\b|\bstyle\s*===\s*'/);
    expect(src).not.toMatch(/https?:\/\/|stripe|checkout/i);
  });
});
