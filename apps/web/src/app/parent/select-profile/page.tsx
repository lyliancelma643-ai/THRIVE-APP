'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { PACK_LABELS, asPack, limit as planLimit, type Pack } from '@/lib/packs';

// ── Types ────────────────────────────────────────────────────────────────────
type MemberType = 'PARENT' | 'CHILD';
type Step = 'choose' | 'form' | 'success' | 'quota';

const GENDER_OPTIONS = [
  { value: 'MALE',   label: 'Garçon' },
  { value: 'FEMALE', label: 'Fille'   },
  { value: 'OTHER',  label: 'Autre'   },
];

const SPORT_OPTIONS = [
  'Soccer', 'Basketball', 'Hockey', 'Natation', 'Tennis',
  'Volleyball', 'Gym', 'Arts martiaux', 'Baseball', 'Autre',
];

// Calcul date de naissance depuis âge
const ageToDob = (age: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().split('T')[0];
};

// URL du site vitrine (marketing). Configurable via NEXT_PUBLIC_SITE_URL ;
// sinon site local (Vite, port 5173) en dev, site déployé en production.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://thrivesportpositive.com'
    : 'http://localhost:5173');

// ── Page principale ───────────────────────────────────────────────────────────────
export default function SelectProfilePage() {
  const router = useRouter();

  const [step, setStep]                 = useState<Step>('choose');
  const [memberType, setMemberType]     = useState<MemberType | null>(null);
  const [currentUser, setCurrentUser]   = useState<{ id: string; email: string } | null>(null);
  const [familyId, setFamilyId]         = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [successName, setSuccessName]   = useState('');
  const [initLoading, setInitLoading]   = useState(true);
  // Quotas du forfait (maxChildren / maxParents) — l'UI prévient, la base garantit
  const [pack, setPack]                 = useState<Pack>('ESSENTIEL');
  const [childCount, setChildCount]     = useState(0);
  const [memberCount, setMemberCount]   = useState(1);

  // Formulaires
  const [parentForm, setParentForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
  });
  const [childForm, setChildForm] = useState({
    first_name: '', last_name: '', age: '', gender: '', sport: '', notes: '',
  });

  // Init : récup session + famille existante
  useEffect(() => {
    const init = async () => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
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

      if (fam?.id) {
        setFamilyId(fam.id);
        setPack(asPack(fam.pack));
        // Compteurs de quotas (enfants actifs + comptes parents de la famille)
        const [childrenRes, membersRes] = await Promise.all([
          supabase
            .from('children')
            .select('id', { count: 'exact', head: true })
            .eq('family_id', fam.id)
            .eq('is_active', true),
          supabase
            .from('family_members')
            .select('id', { count: 'exact', head: true })
            .eq('family_id', fam.id),
        ]);
        setChildCount(childrenRes.count ?? 0);
        setMemberCount(Math.max(membersRes.count ?? 1, 1));
      }
      setInitLoading(false);
    };
    init();
  }, [router]);

  // Quota atteint pour ce type de profil ? (null = illimité)
  const quotaBlocked = (type: MemberType): boolean => {
    if (!familyId) return false; // pas encore de famille : premier ajout toujours permis
    if (type === 'CHILD') {
      const max = planLimit(pack, 'maxChildren');
      return max !== null && childCount >= max;
    }
    const max = planLimit(pack, 'maxParents');
    return max !== null && memberCount >= max;
  };

  const resetForms = () => {
    setStep('choose');
    setMemberType(null);
    setError(null);
    setParentForm({ first_name: '', last_name: '', email: '', phone: '' });
    setChildForm({ first_name: '', last_name: '', age: '', gender: '', sport: '', notes: '' });
  };

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      memberType === 'PARENT' ? await submitParent() : await submitChild();
      setStep('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Créer parent — via l'edge function admin-create-user (service role) :
  // ne touche PAS à la session du parent connecté (signUp basculerait la session).
  const submitParent = async () => {
    const { first_name, last_name, email, phone } = parentForm;
    if (!first_name.trim() || !last_name.trim() || !email.trim())
      throw new Error('Prénom, nom et email sont obligatoires.');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Session expirée, veuillez vous reconnecter.');

    const tempPwd = `Thrive${Math.random().toString(36).slice(-8)}!1`;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://kkdcgzvdmipmrgkawnky.supabase.co'}/functions/v1/admin-create-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          password: tempPwd,
          firstName: first_name.trim(),
          lastName: last_name.trim(),
          role: 'PARENT',
          phone: phone || undefined,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? 'Impossible de créer le compte.');

    // Rattacher le co-parent à la famille (socle du quota maxParents — le
    // trigger de la migration 039 revérifie côté base).
    const newProfileId: string | undefined = data?.profile?.id;
    if (familyId && newProfileId) {
      const { error: memberErr } = await supabase
        .from('family_members')
        .insert({ family_id: familyId, profile_id: newProfileId, member_role: 'PARENT' });
      if (memberErr) throw new Error(memberErr.message);
      setMemberCount((n) => n + 1);
    }

    // Le compte est créé avec un mot de passe temporaire jamais montré : on
    // envoie donc un email « définir mon mot de passe » au nouveau parent,
    // sans quoi il ne pourrait jamais se connecter.
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setSuccessName(`${first_name.trim()} ${last_name.trim()}`);
  };

  // Créer enfant
  const submitChild = async () => {
    const { first_name, last_name, age, gender, sport, notes } = childForm;
    if (!first_name.trim() || !last_name.trim())
      throw new Error('Prénom et nom sont obligatoires.');
    const ageNum = Number(age);
    if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 25)
      throw new Error('L’âge doit être entre 1 et 25 ans.');
    if (!currentUser)
      throw new Error('Session expirée, veuillez vous reconnecter.');

    // Créer famille si inexistante
    let fid = familyId;
    if (!fid) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', currentUser.id)
        .single();

      const { data: newFam, error: famErr } = await supabase
        .from('families')
        .insert({
          name: `Famille ${(prof?.last_name ?? 'Nouvelle').trim()}`,
          parent_id: currentUser.id,
        })
        .select('id')
        .single();

      if (famErr) throw new Error('Erreur création famille : ' + famErr.message);
      fid = newFam.id;
      setFamilyId(fid);
    }

    // Insérer enfant
    const { error: childErr } = await supabase.from('children').insert({
      family_id:     fid,
      first_name:    first_name.trim(),
      last_name:     last_name.trim(),
      date_of_birth: ageToDob(ageNum),
      gender:        gender || null,
      sport:         sport  || null,
      notes:         notes  || null,
      is_active:     true,
    });
    if (childErr) throw new Error(childErr.message);
    setChildCount((n) => n + 1);
    setSuccessName(`${first_name.trim()} ${last_name.trim()}`);
  };

  // Loading init
  if (initLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream relative flex items-center justify-center p-4">
      {/* Retour vers le site vitrine */}
      <a
        href={SITE_URL}
        aria-label="Retourner au site Thrive Sport Positive"
        className="absolute top-4 right-4 z-10 inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full bg-white/60 hover:bg-white/80 text-navy-600 hover:text-navy-900 text-sm font-bold shadow-card transition-colors"
      >
        <svg
          aria-hidden
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        Retour au site
      </a>

      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-500 to-navy-700 text-3xl shadow-card mb-4">
            👨‍👩‍👧‍👦
          </div>
          <h1 className="text-2xl font-bold text-navy-900">Ajouter un membre</h1>
          <p className="text-slate-500 mt-1 text-sm">Choisissez le type de profil à créer</p>
        </div>

        {/* ─── STEP 1 : Choix ─── */}
        {step === 'choose' && (
          <div className="grid grid-cols-2 gap-4">
            {([
              { type: 'PARENT' as MemberType, icon: '👨‍👩‍👧', label: 'Parent',  desc: 'Ajouter un parent ou tuteur',      color: 'from-navy-500 to-navy-700',    border: 'hover:border-navy-300' },
              { type: 'CHILD'  as MemberType, icon: '🧒',         label: 'Enfant',  desc: 'Ajouter un enfant à la famille', color: 'from-sun to-sun-dark',  border: 'hover:border-sun-dark' },
            ]).map(({ type, icon, label, desc, color, border }) => (
              <button
                key={type}
                onClick={() => {
                  setMemberType(type);
                  setError(null);
                  setStep(quotaBlocked(type) ? 'quota' : 'form');
                }}
                className={`group bg-white rounded-2xl p-6 border-2 border-transparent ${border} shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-3xl shadow-md mb-4 group-hover:scale-110 transition-transform`}>
                  {icon}
                </div>
                <p className="font-bold text-slate-900 text-lg">{label}</p>
                <p className="text-slate-500 text-sm mt-1">{desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* ─── Quota du forfait atteint : proposer l'upgrade plutôt que le formulaire ─── */}
        {step === 'quota' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => { setStep('choose'); setMemberType(null); }}
                aria-label="Retour au choix du profil"
                className="w-11 h-11 -ml-2 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xl transition-colors"
              >
                ←
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {memberType === 'CHILD' ? '🧒 Ajouter un enfant' : '👨‍👩‍👧 Ajouter un parent'}
                </h2>
                <p className="text-xs text-slate-400">Forfait {PACK_LABELS[pack]}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-navy-100 bg-navy-50 px-4 py-3.5 mb-6">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-navy-600 shrink-0 mt-0.5" aria-hidden>
                <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.4" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <p className="text-sm text-navy-800 leading-relaxed">
                <span className="font-semibold">
                  Votre forfait {PACK_LABELS[pack]} inclut{' '}
                  {memberType === 'CHILD'
                    ? `${planLimit(pack, 'maxChildren')} profil${(planLimit(pack, 'maxChildren') ?? 0) > 1 ? 's' : ''} enfant`
                    : `${planLimit(pack, 'maxParents')} compte${(planLimit(pack, 'maxParents') ?? 0) > 1 ? 's' : ''} parent`}
                  .
                </span>{' '}
                Passez à un forfait supérieur pour{' '}
                {memberType === 'CHILD'
                  ? 'accompagner un enfant de plus'
                  : 'ajouter un parent ou superviseur'}
                .
              </p>
            </div>
            <Link
              href="/parent/upgrade"
              className="block w-full text-center px-6 py-3 rounded-full bg-sun text-navy-900 text-sm font-bold hover:bg-sun-dark transition-colors"
            >
              Voir les forfaits
            </Link>
          </div>
        )}

        {/* ─── STEP 2 : Formulaire ─── */}
        {step === 'form' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => { setStep('choose'); setError(null); }}
                aria-label="Retour au choix du profil"
                className="w-11 h-11 -ml-2 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xl transition-colors"
              >
                ←
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {memberType === 'PARENT' ? '👨‍👩‍👧 Nouveau parent' : '🧒 Nouvel enfant'}
                </h2>
                <p className="text-xs text-slate-400">
                  {memberType === 'CHILD' && !familyId ? 'La famille sera créée automatiquement' : 'Les champs * sont obligatoires'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Prénom + Nom — commun aux deux */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Prénom *</label>
                  <input required type="text" placeholder={memberType === 'PARENT' ? 'Jean' : 'Emma'}
                    value={memberType === 'PARENT' ? parentForm.first_name : childForm.first_name}
                    onChange={(e) => memberType === 'PARENT'
                      ? setParentForm({ ...parentForm, first_name: e.target.value })
                      : setChildForm({ ...childForm, first_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Nom *</label>
                  <input required type="text" placeholder="Tremblay"
                    value={memberType === 'PARENT' ? parentForm.last_name : childForm.last_name}
                    onChange={(e) => memberType === 'PARENT'
                      ? setParentForm({ ...parentForm, last_name: e.target.value })
                      : setChildForm({ ...childForm, last_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
                  />
                </div>
              </div>

              {/* PARENT — champs spécifiques */}
              {memberType === 'PARENT' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Email *</label>
                    <input required type="email" placeholder="jean@exemple.com"
                      value={parentForm.email}
                      onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Téléphone</label>
                    <input type="tel" placeholder="514-555-0123"
                      value={parentForm.phone}
                      onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
                    />
                  </div>
                </>
              )}

              {/* ENFANT — champs spécifiques */}
              {memberType === 'CHILD' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Âge *</label>
                      <input required type="number" min={1} max={25} placeholder="8"
                        value={childForm.age}
                        onChange={(e) => setChildForm({ ...childForm, age: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Genre</label>
                      <select value={childForm.gender} onChange={(e) => setChildForm({ ...childForm, gender: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 bg-white">
                        <option value="">—</option>
                        {GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Sport principal</label>
                    <select value={childForm.sport} onChange={(e) => setChildForm({ ...childForm, sport: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 bg-white">
                      <option value="">Choisir un sport...</option>
                      {SPORT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Notes</label>
                    <textarea rows={3} placeholder="Allergies, besoins spéciaux..."
                      value={childForm.notes}
                      onChange={(e) => setChildForm({ ...childForm, notes: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 resize-none"
                    />
                  </div>
                </>
              )}

              {/* Erreur */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <span className="shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={isSubmitting}
                className={`w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-200 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${
                  memberType === 'PARENT'
                    ? 'bg-navy-600 hover:bg-navy-700'
                    : 'bg-navy-600 hover:bg-navy-700'
                }`}>
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                      <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Création en cours...
                  </span>
                ) : memberType === 'PARENT' ? 'Créer le compte parent' : 'Ajouter l’enfant'}
              </button>
            </form>
          </div>
        )}

        {/* ─── STEP 3 : Succès ─── */}
        {step === 'success' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✅</div>
            <h2 className="text-2xl font-bold text-navy-900 mb-2">
              {memberType === 'PARENT' ? 'Compte créé !' : 'Enfant ajouté !'}
            </h2>
            <p className="text-slate-500 mb-1">
              <span className="font-semibold text-slate-800">{successName}</span>
              {memberType === 'PARENT'
                ? ' a bien été enregistré(e) comme parent. Un email lui a été envoyé pour choisir son mot de passe.'
                : ' a bien été ajouté(e) à votre famille.'}
            </p>
            {memberType === 'CHILD' && (
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-2">
                La fiche de votre enfant a bien été enregistrée. Elle est en cours de
                validation par notre équipe avant l'ouverture complète de votre espace.
              </p>
            )}
            <p className="text-xs text-green-600 font-medium mb-8">🟢 Visible instantanément dans le dashboard admin</p>
            <div className="flex flex-col gap-3">
              <button onClick={resetForms}
                className="w-full py-3 rounded-xl border-2 border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                + Ajouter un autre membre
              </button>
              <button onClick={() => router.push('/dashboard')}
                className="w-full py-3 rounded-xl bg-navy-600 text-white font-bold hover:bg-navy-700 transition-colors shadow-md">
                Retour au dashboard
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
