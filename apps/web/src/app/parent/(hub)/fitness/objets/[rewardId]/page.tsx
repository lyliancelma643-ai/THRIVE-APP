'use client';

// E7 — Un objet symbolique (Fiche Identité, bilan, Boîte à Outils, Certificat, lettre).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { P3Frame, type P3Ctx } from '@/components/parent/p3/P3Frame';
import { BackLink } from '@/components/parent/p3/pieces';
import { RewardView } from '@/components/parent/p3/RewardView';
import { readLocalJSON } from '@/components/parent/p3/session';
import type { RewardId } from '@/lib/p3-moments';
import { P3_BASE } from '@/lib/p3-moments/app';
import { claimCertificateReward, fetchCertificateGrant, grantMessage } from '@/lib/reward-grant';

function ObjetInner({ ctx, id }: { ctx: P3Ctx; id: string }) {
  const row = ctx.data.rewardRows.find((r) => r.reward_id === id);
  const [bilan4Pending, setBilan4Pending] = useState(false);
  const [bonusNote, setBonusNote] = useState<string | null>(null);

  // Certificat : état réel du « 1 mois offert ». Pas encore appliqué → on relance
  // la réclamation (idempotente) puis on relit l'état.
  const familyId = ctx.child.family_id;
  const isCertificate = id === 'certificat' && Boolean(row) && Boolean(familyId);
  useEffect(() => {
    if (!isCertificate) return;
    let alive = true;
    (async () => {
      let grant = await fetchCertificateGrant(familyId).catch(() => null);
      if (!grant || grant.status === 'FAILED' || (grant.status === 'PENDING' && grant.channel !== 'deferred')) {
        await claimCertificateReward(ctx.child.id).catch(() => undefined);
        grant = await fetchCertificateGrant(familyId).catch(() => null);
      }
      if (alive) setBonusNote(grantMessage(grant));
    })();
    return () => {
      alive = false;
    };
  }, [isCertificate, familyId, ctx.child.id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const saved = readLocalJSON<{ answers?: string[] } | null>(`thrive.p3.bilan4.${ctx.child.id}`, null);
    setBilan4Pending(!saved?.answers?.some((a) => a.trim()));
  }, [ctx.child.id]);

  return (
    <div className="max-w-2xl">
      <div className="p3-noprint">
        <BackLink href={`${P3_BASE}/carnet`} label="Le carnet" />
      </div>
      <div className="mt-4">
        {row ? (
          <RewardView
            id={row.reward_id as RewardId}
            payload={row.payload}
            earnedAt={row.earned_at}
            firstName={ctx.firstName}
            bilan4Pending={bilan4Pending}
            bonusNote={bonusNote}
          />
        ) : (
          <div className="py-12">
            <p className="text-[16px] text-body">Cet objet s&apos;assemble au fil du programme, moment après moment.</p>
            <Link href={P3_BASE} className="inline-block mt-4 min-h-[44px] font-semibold text-accent-ink underline">
              Retour à Maison
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ObjetPage() {
  const params = useParams<{ rewardId: string }>();
  return <P3Frame>{(ctx) => <ObjetInner ctx={ctx} id={String(params.rewardId ?? '')} />}</P3Frame>;
}
