import { useState } from 'react';
import { Share } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ProgrammePaiementView } from '../../../components/offres/ProgrammePaiementView';
import { programByPack } from '../../../components/offres/pricing';
import { OFFRES_PROGRAMMES_IN_APP } from '../../../lib/offresFlags';
import { startProgramCheckout, type ProgramPaymentMode } from '../../../services/programPayments';

// Y2 — Programme · paiement. Le montant affiché est indicatif : le client envoie
// seulement { pack, mode } ; le serveur décide du montant et des taxes.
export default function ProgrammePaiementScreen() {
  const { pack } = useLocalSearchParams<{ pack: string }>();
  const router = useRouter();
  const [mode, setMode] = useState<ProgramPaymentMode>('deux_versements');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const program = programByPack(pack);
  if (!OFFRES_PROGRAMMES_IN_APP || !program) return <Redirect href="/(parent)/offres" />;

  const pay = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const r = await startProgramCheckout(program.pack, mode);
      if (r.status === 'paid') {
        router.replace('/(parent)/maison');
      } else if (r.status === 'error') {
        setNotice(r.message);
      } else if (r.status === 'opened') {
        setNotice('Une fois le paiement terminé, ton accès s’ouvre automatiquement.');
      } else if (r.status === 'disabled') {
        setNotice('Le paiement n’est pas disponible pour le moment.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProgrammePaiementView
      program={program}
      mode={mode}
      onModeChange={setMode}
      busy={busy}
      notice={notice}
      onPay={pay}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(parent)/offres'))}
      onShare={() => {
        Share.share({ message: `THRIVE ${program.name} — ${program.summary}` }).catch(() => undefined);
      }}
    />
  );
}
