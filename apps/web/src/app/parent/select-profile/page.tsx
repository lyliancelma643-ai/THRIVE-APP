'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Ajouter un membre à la famille (enfant ou co-parent) — dans la DA de l'espace
// parent (ambiances Nuit / Jour, mêmes jetons que la coque).
//
//   • /parent/select-profile                       → choix Enfant / Parent
//   • /parent/select-profile?type=CHILD            → formulaire enfant direct
//   • …&from=signup                                → suite de l'inscription :
//       message d'accueil, enfants non enregistrés repris, « Plus tard ».
//
// On revient toujours dans l'app (jamais vers le site vitrine) et la liste des
// enfants du header est rechargée avant le retour.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { BrandLogo } from '@/components/BrandLogo';
import { Icon, type IconName } from '@/components/ui';
import { PACK_LABELS, asPack, limit as planLimit, type Pack } from '@/lib/packs';
import { SIGNUP_MISSED_KEY, type SignupMissed } from '@/lib/signup';
import { useAuthStore } from '@/stores/auth.store';
import { useChildStore } from '@/stores/child.store';
import { useAccessStore } from '@/lib/access';

type MemberType = 'PARENT' | 'CHILD';
type Step = 'choose' | 'form' | 'success' | 'quota';

const GENDER_OPTIONS = [
  { value: 'FEMALE', label: 'Fille' },
  { value: 'MALE', label: 'Garçon' },
  { value: 'OTHER', label: 'Autre / ne pas préciser' },
];

const SPORT_OPTIONS = [
  'Hockey', 'Soccer', 'Basketball', 'Natation', 'Tennis', 'Volleyball',
  'Gymnastique', 'Arts martiaux', 'Baseball', 'Patinage', 'Football',
  'Athlétisme', 'Autre',
];

const MIN_AGE = 8;
const MAX_AGE = 17;
const HOME = '/parent/bilans';

const ageToDob = (age: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().split('T')[0];
};

const FIELD =
  'w-full min-h-[48px] rounded-[14px] bg-field border border-line2 px-4 text-[16px] text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-line)]';
const LABEL = 'block text-[13px] font-semibold text-soft mb-1.5';

// Messages de la base traduits pour un parent.
function humanError(msg: string): string {
  if (/quota/i.test(msg)) return 'Ton forfait ne permet pas d’ajouter un profil de plus.';
  if (/already|exist|registered|duplicate/i.test(msg)) return 'Un compte existe déjà avec cet email.';
  if (/fetch|network/i.test(msg)) return 'Connexion interrompue. Vérifie ton réseau et réessaie.';
  return msg || 'Une erreur est survenue. Réessaie dans un instant.';
}

function readMissed(): SignupMissed | null {
  try {
    const raw = window.sessionStorage.getItem(SIGNUP_MISSED_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(SIGNUP_MISSED_KEY);
    const parsed = JSON.parse(raw) as SignupMissed;
    return Array.isArray(parsed?.names) && parsed.names.length ? parsed : null;
  } catch {
    return null;
  }
}

function SelectProfileInner() {
  const router = useRouter();
  const search = useSearchParams();
  const fromSignup = search.get('from') === 'signup';
  const wanted = search.get('type') === 'CHILD' ? 'CHILD' : search.get('type') === 'PARENT' ? 'PARENT' : null;

  const authUser = useAuthStore((s) => s.user);
  const loadChildren = useChildStore((s) => s.loadChildren);
  const selectChild = useChildStore((s) => s.selectChild);
  const refreshAccess = useAccessStore((s) => s.refresh);

  const [step, setStep] = useState<Step>('choose');
  const [memberType, setMemberType] = useState<MemberType | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successName, setSuccessName] = useState('');
  const [newChildId, setNewChildId] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(true);
  const [missed, setMissed] = useState<SignupMissed | null>(null);
  // Co-parent (membre d'une famille créée par un autre parent) : seul le parent
  // principal ajoute des profils — la base le garantit, l'écran le dit.
  const [coParent, setCoParent] = useState(false);
  // Quotas du forfait (maxChildren / maxParents) — l'UI prévient, la base garantit
  const [pack, setPack] = useState<Pack>('ESSENTIEL');
  const [childCount, setChildCount] = useState(0);
  const [memberCount, setMemberCount] = useState(1);

  const [parentForm, setParentForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [childForm, setChildForm] = useState({
    first_name: '', last_name: '', age: '', gender: '', sport: '', notes: '',
  });

  // Quota atteint pour ce type de profil ? (null = illimité)
  const isQuotaBlocked = (type: MemberType, fam: string | null, p: Pack, kids: number, members: number) => {
    if (!fam) return false; // pas encore de famille : premier ajout toujours permis
    const max = planLimit(p, type === 'CHILD' ? 'maxChildren' : 'maxParents');
    return max !== null && (type === 'CHILD' ? kids : members) >= max;
  };

  // Init : session, famille existante, compteurs, puis étape de départ.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (!alive) return;
      if (userErr || !user) {
        router.push('/login');
        return;
      }
      setCurrentUser({ id: user.id, email: user.email ?? '' });

      const { data: fam } = await supabase
        .from('families')
        .select('id, pack')
        .eq('parent_id', user.id)
        .maybeSingle();

      if (!fam?.id) {
        const { data: membership } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('profile_id', user.id)
          .limit(1)
          .maybeSingle();
        if (!alive) return;
        if (membership?.family_id) {
          setCoParent(true);
          setInitLoading(false);
          return;
        }
      }

      let p: Pack = 'ESSENTIEL';
      let kids = 0;
      let members = 1;
      if (fam?.id) {
        p = asPack(fam.pack);
        const [childrenRes, membersRes] = await Promise.all([
          supabase.from('children').select('id', { count: 'exact', head: true }).eq('family_id', fam.id).eq('is_active', true),
          supabase.from('family_members').select('id', { count: 'exact', head: true }).eq('family_id', fam.id),
        ]);
        kids = childrenRes.count ?? 0;
        members = Math.max(membersRes.count ?? 1, 1);
      }
      if (!alive) return;
      setFamilyId(fam?.id ?? null);
      setPack(p);
      setChildCount(kids);
      setMemberCount(members);

      const m = fromSignup ? readMissed() : null;
      setMissed(m);
      const lastName = (user.user_metadata?.lastName as string | undefined)?.trim() ?? '';
      setChildForm((f) => ({ ...f, first_name: m?.names[0] ?? '', last_name: lastName }));

      if (wanted) {
        setMemberType(wanted);
        setStep(isQuotaBlocked(wanted, fam?.id ?? null, p, kids, members) ? 'quota' : 'form');
      }
      setInitLoading(false);
    })();
    return () => {
      alive = false;
    };
    // Une seule fois à l'arrivée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (type: MemberType) => {
    setMemberType(type);
    setError(null);
    setStep(isQuotaBlocked(type, familyId, pack, childCount, memberCount) ? 'quota' : 'form');
  };

  const resetForms = () => {
    setStep('choose');
    setMemberType(null);
    setError(null);
    setNewChildId(null);
    setParentForm({ first_name: '', last_name: '', email: '', phone: '' });
    setChildForm((f) => ({ first_name: '', last_name: f.last_name, age: '', gender: '', sport: '', notes: '' }));
  };

  // Retour dans l'app : liste des enfants et état d'accès à jour, nouvel enfant sélectionné.
  const goHome = async () => {
    if (currentUser) await loadChildren(currentUser.id);
    if (newChildId) selectChild(newChildId);
    refreshAccess();
    router.push(HOME);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      if (memberType === 'PARENT') await submitParent();
      else await submitChild();
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (err: unknown) {
      setError(humanError(err instanceof Error ? err.message : ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Créer un co-parent — via l'edge function admin-create-user (service role) :
  // ne touche PAS à la session du parent connecté (signUp basculerait la session).
  const submitParent = async () => {
    const { first_name, last_name, email, phone } = parentForm;
    if (!first_name.trim() || !last_name.trim() || !email.trim())
      throw new Error('Prénom, nom et email sont obligatoires.');
    if (!familyId) throw new Error('Ajoute d’abord ton enfant : le co-parent rejoindra sa famille.');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Session expirée : reconnecte-toi.');

    const tempPwd = `Thrive${crypto.getRandomValues(new Uint32Array(2)).join('')}!aA`;
    const { data, error: fnErr } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: email.trim(),
        password: tempPwd,
        firstName: first_name.trim(),
        lastName: last_name.trim(),
        role: 'PARENT',
        phone: phone || undefined,
      },
    });
    if (fnErr || data?.error) {
      let msg = data?.error as string | undefined;
      const ctx = (fnErr as { context?: Response } | null)?.context;
      if (!msg && ctx && typeof ctx.json === 'function') {
        msg = await ctx.json().then((b: { error?: string }) => b?.error, () => undefined);
      }
      throw new Error(msg ?? 'Impossible de créer le compte.');
    }

    // Rattacher le co-parent à la famille (socle du quota maxParents — le
    // trigger de la migration 039 revérifie côté base).
    const newProfileId: string | undefined = data?.profile?.id;
    if (newProfileId) {
      const { error: memberErr } = await supabase
        .from('family_members')
        .insert({ family_id: familyId, profile_id: newProfileId, member_role: 'PARENT' });
      if (memberErr) throw new Error(memberErr.message);
      setMemberCount((n) => n + 1);
    }

    // Le compte est créé avec un mot de passe temporaire jamais montré : on
    // envoie donc un email « définir mon mot de passe » au nouveau parent.
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setSuccessName(first_name.trim());
  };

  const submitChild = async () => {
    const { first_name, last_name, age, gender, sport, notes } = childForm;
    if (!first_name.trim() || !last_name.trim()) throw new Error('Prénom et nom sont obligatoires.');
    const ageNum = Number(age);
    if (!age || !Number.isInteger(ageNum) || ageNum < MIN_AGE || ageNum > MAX_AGE)
      throw new Error(`Le programme THRIVE accompagne les ${MIN_AGE}–${MAX_AGE} ans : indique un âge dans cette tranche.`);
    if (!currentUser) throw new Error('Session expirée : reconnecte-toi.');

    // Créer la famille si elle n'existe pas encore
    let fid = familyId;
    if (!fid) {
      const { data: newFam, error: famErr } = await supabase
        .from('families')
        .insert({ name: `Famille ${last_name.trim()}`, parent_id: currentUser.id })
        .select('id')
        .single();
      if (famErr) throw new Error(famErr.message);
      fid = newFam.id as string;
      setFamilyId(fid);
    }

    const { data: inserted, error: childErr } = await supabase
      .from('children')
      .insert({
        family_id: fid,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        date_of_birth: ageToDob(ageNum),
        gender: gender || null,
        sport: sport || null,
        notes: notes.trim() || null,
        is_active: true,
      })
      .select('id')
      .single();
    if (childErr) throw new Error(childErr.message);
    setNewChildId((inserted?.id as string | undefined) ?? null);
    setChildCount((n) => n + 1);
    setSuccessName(first_name.trim());
    // Enfant suivant non enregistré à l'inscription : on le propose ensuite.
    setMissed((m) => {
      if (!m) return m;
      const rest = m.names.filter((n) => n !== first_name.trim());
      return rest.length ? { ...m, names: rest } : null;
    });
  };

  if (initLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-night-bg" role="status" aria-label="Chargement">
        <span className="w-6 h-6 rounded-full border-2 border-line2 border-t-accent animate-spin" aria-hidden />
      </div>
    );
  }

  const maxChildren = planLimit(pack, 'maxChildren');
  const maxParents = planLimit(pack, 'maxParents');

  return (
    <div className="min-h-dvh bg-night-bg text-night-body">
      <header className="sticky top-0 z-header bg-night-bg safe-top">
        <div className="max-w-xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <Link
            href={HOME}
            onClick={(e) => {
              e.preventDefault();
              goHome();
            }}
            className="inline-flex items-center gap-1.5 min-h-[44px] -ml-1 px-1 text-[15px] font-semibold text-soft hover:text-ink transition-colors"
          >
            <Icon name="arrow-left" className="w-4 h-4" />
            {fromSignup ? 'Plus tard' : 'Retour'}
          </Link>
          <BrandLogo className="w-8 h-8" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 pt-4 pb-16 animate-om-up">
        {fromSignup && step !== 'success' && (
          <div className="nc-card ring-1 ring-accent-line mb-6">
            <p className="font-display text-[19px] font-semibold text-ink">Ton compte est créé.</p>
            <p className="text-[15px] leading-[1.55] text-soft mt-1 text-pretty">
              {missed
                ? missed.quota
                  ? `Ton forfait ${PACK_LABELS[pack]} inclut ${maxChildren ?? 1} profil enfant : ${missed.names.join(', ')} n’a pas pu être ajouté. Ton coach peut faire évoluer ton forfait.`
                  : `On n’a pas pu enregistrer ${missed.names.join(', ')}. Vérifie les informations ci-dessous et réessaie.`
                : 'Ajoute la fiche de ton enfant : c’est elle qui ouvre son parcours avec son coach.'}
            </p>
          </div>
        )}

        {coParent && (
          <div className="nc-card">
            <p className="font-display text-[20px] font-semibold text-ink">Ta famille est gérée par un autre parent</p>
            <p className="text-[15px] leading-[1.55] text-soft mt-2 text-pretty">
              Seul le parent qui a créé la famille peut ajouter un enfant ou un parent. Demande-lui, ou écris au support THRIVE.
            </p>
            <Link
              href="/parent/messages"
              className="mt-5 inline-flex items-center justify-center min-h-[48px] px-6 rounded-full border border-line2 bg-chip text-ink text-[15px] font-semibold"
            >
              Écrire au support
            </Link>
          </div>
        )}

        {/* ─── Choix ─── */}
        {!coParent && step === 'choose' && (
          <>
            <h1 className="font-display text-[30px] leading-[1.15] font-semibold text-night-ink">Ajouter à ta famille</h1>
            <p className="text-[15px] text-soft mt-2">Qui veux-tu ajouter ?</p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  { type: 'CHILD', icon: 'child', label: 'Un enfant', desc: 'Il suivra le parcours THRIVE avec son coach.' },
                  { type: 'PARENT', icon: 'users', label: 'Un parent ou tuteur', desc: 'Il verra le parcours de vos enfants dans l’app.' },
                ] as { type: MemberType; icon: IconName; label: string; desc: string }[]
              ).map((o) => (
                <button
                  key={o.type}
                  type="button"
                  onClick={() => choose(o.type)}
                  className="nc-row text-left p-5 flex items-start gap-4 transition-colors hover:bg-chip"
                >
                  <span className="w-11 h-11 shrink-0 rounded-full bg-sun/10 text-accent-ink grid place-items-center">
                    <Icon name={o.icon} className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[18px] font-semibold text-ink">{o.label}</span>
                    <span className="block text-[14px] leading-[1.45] text-soft mt-1">{o.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ─── Quota du forfait atteint ─── */}
        {step === 'quota' && (
          <>
            <BackToChoice onClick={() => { setStep('choose'); setMemberType(null); }} hidden={Boolean(wanted)} />
            <h1 className="font-display text-[28px] leading-[1.15] font-semibold text-night-ink">
              {memberType === 'CHILD' ? 'Ajouter un enfant' : 'Ajouter un parent'}
            </h1>
            <div className="nc-card mt-5 flex items-start gap-3">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-sun/10 text-accent-ink grid place-items-center">
                <Icon name="lock" className="w-5 h-5" />
              </span>
              <p className="text-[15px] leading-[1.55] text-body">
                <span className="font-semibold text-ink">
                  Ton forfait {PACK_LABELS[pack]} inclut{' '}
                  {memberType === 'CHILD'
                    ? `${maxChildren} profil${(maxChildren ?? 0) > 1 ? 's' : ''} enfant`
                    : `${maxParents} compte${(maxParents ?? 0) > 1 ? 's' : ''} parent`}
                  .
                </span>{' '}
                {memberType === 'CHILD'
                  ? 'Pour accompagner un enfant de plus, ton coach peut faire évoluer ton forfait.'
                  : 'Pour ajouter un parent ou tuteur, ton coach peut faire évoluer ton forfait.'}
              </p>
            </div>
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link
                href="/parent/upgrade"
                className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-full bg-accent text-accent-on text-[15px] font-bold"
              >
                Voir les forfaits
              </Link>
              <Link
                href="/parent/messages"
                className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-full border border-line2 bg-chip text-ink text-[15px] font-semibold"
              >
                Écrire à mon coach
              </Link>
            </div>
          </>
        )}

        {/* ─── Formulaire ─── */}
        {step === 'form' && memberType && (
          <>
            <BackToChoice onClick={() => { setStep('choose'); setError(null); }} hidden={Boolean(wanted)} />
            <h1 className="font-display text-[28px] leading-[1.15] font-semibold text-night-ink">
              {memberType === 'PARENT' ? 'Nouveau parent ou tuteur' : missed ? `La fiche de ${childForm.first_name || 'ton enfant'}` : 'La fiche de ton enfant'}
            </h1>
            {memberType === 'PARENT' && (
              <p className="text-[15px] text-soft mt-2 text-pretty">
                Il recevra un email pour choisir son mot de passe, puis verra le parcours de vos enfants.
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="sp-first" className={LABEL}>Prénom</label>
                  <input
                    id="sp-first"
                    required
                    autoComplete={memberType === 'PARENT' ? 'given-name' : 'off'}
                    autoCapitalize="words"
                    value={memberType === 'PARENT' ? parentForm.first_name : childForm.first_name}
                    onChange={(e) =>
                      memberType === 'PARENT'
                        ? setParentForm({ ...parentForm, first_name: e.target.value })
                        : setChildForm({ ...childForm, first_name: e.target.value })
                    }
                    className={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="sp-last" className={LABEL}>Nom</label>
                  <input
                    id="sp-last"
                    required
                    autoComplete={memberType === 'PARENT' ? 'family-name' : 'off'}
                    autoCapitalize="words"
                    value={memberType === 'PARENT' ? parentForm.last_name : childForm.last_name}
                    onChange={(e) =>
                      memberType === 'PARENT'
                        ? setParentForm({ ...parentForm, last_name: e.target.value })
                        : setChildForm({ ...childForm, last_name: e.target.value })
                    }
                    className={FIELD}
                  />
                </div>
              </div>

              {memberType === 'PARENT' && (
                <>
                  <div>
                    <label htmlFor="sp-email" className={LABEL}>Email</label>
                    <input
                      id="sp-email"
                      required
                      type="email"
                      autoComplete="email"
                      value={parentForm.email}
                      onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })}
                      className={FIELD}
                    />
                  </div>
                  <div>
                    <label htmlFor="sp-phone" className={LABEL}>Téléphone (facultatif)</label>
                    <input
                      id="sp-phone"
                      type="tel"
                      autoComplete="tel"
                      value={parentForm.phone}
                      onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })}
                      className={FIELD}
                    />
                  </div>
                </>
              )}

              {memberType === 'CHILD' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="sp-age" className={LABEL}>Âge ({MIN_AGE}–{MAX_AGE} ans)</label>
                      <input
                        id="sp-age"
                        required
                        type="number"
                        inputMode="numeric"
                        min={MIN_AGE}
                        max={MAX_AGE}
                        value={childForm.age}
                        onChange={(e) => setChildForm({ ...childForm, age: e.target.value })}
                        className={FIELD}
                      />
                    </div>
                    <div>
                      <label htmlFor="sp-gender" className={LABEL}>Genre (facultatif)</label>
                      <select
                        id="sp-gender"
                        value={childForm.gender}
                        onChange={(e) => setChildForm({ ...childForm, gender: e.target.value })}
                        className={FIELD}
                      >
                        <option value="">—</option>
                        {GENDER_OPTIONS.map((g) => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="sp-sport" className={LABEL}>Sport principal (facultatif)</label>
                    <select
                      id="sp-sport"
                      value={childForm.sport}
                      onChange={(e) => setChildForm({ ...childForm, sport: e.target.value })}
                      className={FIELD}
                    >
                      <option value="">Choisir un sport…</option>
                      {SPORT_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="sp-notes" className={LABEL}>À savoir pour le coach (facultatif)</label>
                    <textarea
                      id="sp-notes"
                      rows={3}
                      maxLength={600}
                      value={childForm.notes}
                      onChange={(e) => setChildForm({ ...childForm, notes: e.target.value })}
                      className={`${FIELD} py-3 resize-none`}
                    />
                    <p className="text-[13px] text-faint mt-1.5">
                      Uniquement ce qui aide l’accompagnement (allergie, besoin particulier…). Visible par son coach et l’équipe THRIVE.
                    </p>
                  </div>
                </>
              )}

              {error && (
                <p role="alert" className="rounded-[14px] bg-red-500/10 ring-1 ring-red-400/30 px-4 py-3 text-[14px] text-danger-ink">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="w-full min-h-[52px] rounded-full bg-accent text-accent-on font-bold text-[16px] disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {isSubmitting && <span className="w-4 h-4 rounded-full border-2 border-navy-900/30 border-t-navy-900 animate-spin" aria-hidden />}
                {isSubmitting ? 'Enregistrement…' : memberType === 'PARENT' ? 'Créer son compte' : 'Enregistrer la fiche'}
              </button>
            </form>
          </>
        )}

        {/* ─── Succès ─── */}
        {step === 'success' && (
          <div className="text-center pt-6">
            <span className="w-16 h-16 mx-auto rounded-full bg-sage/15 text-sage-ink grid place-items-center">
              <Icon name="check" className="w-7 h-7" strokeWidth={2.4} />
            </span>
            <h1 className="mt-5 font-display text-[28px] leading-[1.15] font-semibold text-night-ink">
              {memberType === 'PARENT' ? `${successName} est invité·e` : `${successName} est ajouté·e`}
            </h1>
            <p className="mt-3 text-[15px] leading-[1.6] text-soft max-w-md mx-auto text-pretty">
              {memberType === 'PARENT'
                ? 'Un email vient de partir pour choisir son mot de passe. Il pourra ensuite se connecter et suivre vos enfants.'
                : 'Sa fiche est enregistrée. L’équipe THRIVE la valide puis ton coach ouvre son parcours — tu reçois une notification dès que c’est prêt.'}
            </p>
            <div className="mt-8 flex flex-col gap-3 max-w-sm mx-auto">
              {missed && memberType === 'CHILD' ? (
                <button
                  type="button"
                  onClick={() => {
                    setChildForm((f) => ({ first_name: missed.names[0], last_name: f.last_name, age: '', gender: '', sport: '', notes: '' }));
                    setError(null);
                    setStep(isQuotaBlocked('CHILD', familyId, pack, childCount, memberCount) ? 'quota' : 'form');
                  }}
                  className="min-h-[52px] rounded-full bg-accent text-accent-on font-bold text-[16px]"
                >
                  Ajouter {missed.names[0]}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goHome}
                  className="min-h-[52px] rounded-full bg-accent text-accent-on font-bold text-[16px]"
                >
                  Aller à mon espace
                </button>
              )}
              <button
                type="button"
                onClick={resetForms}
                className="min-h-[48px] rounded-full border border-line2 bg-chip text-ink font-semibold text-[15px]"
              >
                Ajouter quelqu’un d’autre
              </button>
              {missed && memberType === 'CHILD' && (
                <button type="button" onClick={goHome} className="min-h-[44px] text-[15px] font-semibold text-soft">
                  Plus tard
                </button>
              )}
            </div>
          </div>
        )}
        {authUser && step === 'choose' && !fromSignup && (
          <p className="mt-8 text-[13px] text-faint">Connecté·e en tant que {authUser.email}</p>
        )}
      </main>
    </div>
  );
}

function BackToChoice({ onClick, hidden }: { onClick: () => void; hidden: boolean }) {
  if (hidden) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 min-h-[44px] mb-2 -ml-1 px-1 text-[14px] font-semibold text-soft hover:text-ink"
    >
      <Icon name="chevron-right" className="w-4 h-4 rotate-180" />
      Changer de choix
    </button>
  );
}

export default function SelectProfilePage() {
  return (
    <Suspense>
      <SelectProfileInner />
    </Suspense>
  );
}
