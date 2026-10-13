import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { AccountView } from '../components/account/AccountView';
import { AccountPrivacySection } from '../components/AccountPrivacySection';
import { ChildPicker } from '../components/account/ChildPicker';
import { ChildrenSetupView, type ChildDraft } from '../components/account/ChildrenSetupView';
import { LoginView } from '../components/account/LoginView';
import { PreparingSpace, buildPreparingSteps } from '../components/account/PreparingSpace';
import { RegisterView } from '../components/account/RegisterView';
import { WelcomeView } from '../components/account/WelcomeView';
import { useTheme } from '../design';
import { KIDS, PARENT } from './fixtures/arrivee';
import type { GalleryScreen } from './types';

/**
 * Écrans du lot « arrivée et compte » rendus avec des fixtures (DEV uniquement).
 * Le canevas est un iPhone 402 × 874 avec barre d'état (54) et indicateur d'accueil (34) : on simule ces marges
 * pour que la zone sûre du banc web (nulle) reproduise celle d'un vrai iPhone.
 */
function Phone({ children }: { children: ReactNode }) {
  return (
    <SafeAreaInsetsContext.Provider value={{ top: 54, bottom: 34, left: 0, right: 0 }}>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaInsetsContext.Provider>
  );
}

const noop = () => {};

function Login() {
  const [email, setEmail] = useState<string>(PARENT.email);
  const [password, setPassword] = useState('••••••••••');
  return (
    <LoginView
      email={email} password={password} onChangeEmail={setEmail} onChangePassword={setPassword}
      onSubmit={noop} onBack={noop} onForgot={noop}
    />
  );
}

function Register() {
  const [f, setF] = useState<string>(PARENT.firstName);
  const [l, setL] = useState<string>(PARENT.lastName);
  const [e, setE] = useState<string>(PARENT.email);
  const [p, setP] = useState('••••••');
  const [n, setN] = useState(false);
  const [a, setA] = useState(false);
  return (
    <RegisterView
      firstName={f} lastName={l} email={e} password={p}
      onChangeFirstName={setF} onChangeLastName={setL} onChangeEmail={setE} onChangePassword={setP}
      passwordMin={8} newsletter={n} onChangeNewsletter={setN} accepted={a} onChangeAccepted={setA}
      onOpenTerms={noop} onOpenPrivacy={noop} canContinue={false} onContinue={noop} onClose={noop}
    />
  );
}

function Children() {
  const [drafts, setDrafts] = useState<ChildDraft[]>([
    { key: 'k1', firstName: KIDS[0].first_name, age: KIDS[0].age, sport: KIDS[0].sport },
    { key: 'k2', firstName: KIDS[1].first_name, age: KIDS[1].age, sport: KIDS[1].sport },
  ]);
  return (
    <ChildrenSetupView
      drafts={drafts}
      onChange={(k, patch) => setDrafts((all) => all.map((d) => (d.key === k ? { ...d, ...patch } : d)))}
      onAdd={noop} onRemove={noop} onContinue={noop} onBack={noop}
      step={{ index: 2, total: 2 }} canContinue initialSportMenu="k2"
    />
  );
}

function Preparing() {
  const k = KIDS[0];
  return (
    <PreparingSpace
      childName={k.first_name}
      programName="Individuel"
      steps={buildPreparingSteps({
        childName: k.first_name, receivedAt: 'Aujourd’hui, 18 h 02', confirmedAt: 'Aujourd’hui, 18 h 40', coachName: 'Coach Lylian', coachOpened: false,
      })}
    />
  );
}

function Picker() {
  const [sel, setSel] = useState<string | undefined>(KIDS[0].id);
  return (
    <ChildPicker
      childrenList={KIDS.map((k) => ({ id: k.id, first_name: k.first_name, age: k.age, sport: k.sport, sessionLabel: `Séance ${k.session} sur 13`, jersey: k.jersey }))}
      selectedId={sel}
      onSelect={setSel}
      onCancel={noop} onAddChild={noop} onEdit={noop}
    />
  );
}

function Account() {
  const { styleKey } = useTheme();
  const [choice, setChoice] = useState(styleKey);
  return (
    <AccountView
      name={`${PARENT.firstName} ${PARENT.lastName}`}
      email={PARENT.email}
      programValue="Individuel"
      maisonValue="Inclus"
      styleChoice={choice}
      onChangeStyle={setChoice}
      family={KIDS.map((k) => ({ id: k.id, firstName: k.first_name, ageLabel: `${k.age} ans` }))}
      onOpenProgram={noop} onOpenMaison={noop} onOpenOffers={noop} onOpenChild={noop} onOpenChildren={noop}
      onOpenNotifications={noop} onDone={noop} onSignOut={noop}
      data={<AccountPrivacySection />}
    />
  );
}

export const screens: GalleryScreen[] = [
  { id: 'A', title: 'Bienvenue', tab: null, render: () => <Phone><WelcomeView onStart={noop} onLogin={noop} /></Phone> },
  { id: 'B', title: 'Connexion', tab: null, render: () => <Phone><Login /></Phone> },
  { id: 'C', title: 'Inscription · le parent', tab: null, render: () => <Phone><Register /></Phone> },
  { id: 'D', title: 'Inscription · les enfants', tab: null, render: () => <Phone><Children /></Phone> },
  { id: 'E', title: 'Ton espace se prépare', tab: 'bilans', render: () => <Phone><Preparing /></Phone> },
  { id: 'F', title: 'Choisir le profil', tab: null, render: () => <Phone><Picker /></Phone> },
  { id: 'X', title: 'Compte & famille', tab: null, render: () => <Phone><Account /></Phone> },
];
