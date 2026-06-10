'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';

// ── Types ────────────────────────────────────────────────────────────────────
type MemberType = 'PARENT' | 'CHILD';
type Step = 'choose' | 'form' | 'success';

const GENDER_OPTIONS = [
  { value: 'MALE',   label: 'Garçon' },
  { value: 'FEMALE', label: 'Fille'   },
  { value: 'OTHER',  label: 'Autre'   },
];

const SPORT_OPTIONS = [
  'Soccer', 'Basketball', 'Hockey', 'Natation', 'Tennis',
  'Volleyball', 'Gym', 'Arts martiaux', 'Baseball', 'Autre',
];

// Calcul de la date de naissance à partir de l’âge
const ageToDob = (age: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().split('T')[0];
};

// ── Page principale ───────────────────────────────────────────────────────────────
export default function SelectProfilePage() {
  const router = useRouter();

  // État global
  const [step, setStep]               = useState<Step>('choose');
  const [memberType, setMemberType]   = useState<MemberType | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [familyId, setFamilyId]       = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [successName, setSuccessName] = useState('');

  // Formulaire parent
  const [parentForm, setParentForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', city: '', province: '',
  });

  // Formulaire enfant
  const [childForm, setChildForm] = useState({
    first_name: '', last_name: '', age: '', gender: '', sport: '', notes: '',
  });

  // Récupérer l’utilisateur connecté + sa famille
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setCurrentUser({ id: user.id, email: user.email ?? '' });

      // Chercher ou créer la famille du parent connecté
      const { data: fam } = await supabase
        .from('families')
        .select('id')
        .eq('parent_id', user.id)
        .maybeSingle();
      if (fam) { setFamilyId(fam.id); }
    };
    init();
  }, [router]);

  // ── Sélection du type
  const handleChoose = (type: MemberType) => {
    setMemberType(type);
    setError(null);
    setStep('form');
  };

  // ── Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (memberType === 'PARENT') {
        await submitParent();
      } else {
        await submitChild();
      }
      setStep('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Créer un profil parent additionnel (membre de la même famille)
  const submitParent = async () => {
    if (!parentForm.first_name.trim() || !parentForm.last_name.trim() || !parentForm.email.trim()) {
      throw new Error('Prénom, nom et email sont obligatoires.');
    }

    // Créer le compte auth via signUp (mot de passe temporaire, le parent recevra un lien)
    const tempPassword = Math.random().toString(36).slice(-10) + 'Aa1!';
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: parentForm.email.trim(),
      password: tempPassword,
      options: {
        data: {
          firstName: parentForm.first_name.trim(),
          lastName:  parentForm.last_name.trim(),
          role: 'PARENT',
        },
      },
    });

    if (authErr) throw new Error(authErr.message);
    if (!authData.user) throw new Error('Impossible de créer le compte.');

    // Mettre à jour son profil avec téléphone + ville
    await supabase.from('profiles').update({
      phone_number: parentForm.phone || null,
      updated_at: new Date().toISOString(),
    }).eq('id', authData.user.id);

    setSuccessName(`${parentForm.first_name} ${parentForm.last_name}`);
  };

  // ── Créer un enfant lié à la famille du parent connecté
  const submitChild = async () => {
    if (!childForm.first_name.trim() || !childForm.last_name.trim()) {
      throw new Error('Prénom et nom sont obligatoires.');
    }
    if (!childForm.age || isNaN(Number(childForm.age)) || Number(childForm.age) < 1 || Number(childForm.age) > 25) {
      throw new Error('L’âge doit être entre 1 et 25 ans.');
    }
    if (!currentUser) throw new Error('Session expirée, reconnectez-vous.');

    // 1. Assurer que la famille existe (créer si nécessaire)
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
          name: `Famille ${prof?.last_name ?? 'Nouvelle'}`,
          parent_id: currentUser.id,
        })
        .select('id')
        .single();

      if (famErr) throw new Error('Impossible de créer la famille : ' + famErr.message);
      fid = newFam.id;
      setFamilyId(fid);
    }

    // 2. Créer l’enfant
    const { error: childErr } = await supabase.from('children').insert({
      family_id:     fid,
      first_name:    childForm.first_name.trim(),
      last_name:     childForm.last_name.trim(),
      date_of_birth: ageToDob(Number(childForm.age)),
      gender:        childForm.gender || null,
      sport:         childForm.sport  || null,
      notes:         childForm.notes  || null,
      is_active:     true,
    });

    if (childErr) throw new Error(childErr.message);
    setSuccessName(`${childForm.first_name} ${childForm.last_name}`);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo / titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl shadow-lg mb-4">
            👨‍👩‍👧‍👦
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Ajouter un membre</h1>
          <p className="text-slate-500 mt-1 text-sm">Choisissez le type de profil à créer</p>
        </div>

        {/* ─── Étape 1 : Choisir le type ─── */}
        {step === 'choose' && (
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                type: 'PARENT' as MemberType,
                icon: '👨‍👩‍👧',
                label: 'Parent',
                desc: 'Ajouter un parent ou tuteur',
                color: 'from-blue-500 to-cyan-500',
                border: 'hover:border-blue-300',
              },
              {
                type: 'CHILD' as MemberType,
                icon: '🧒',
                label: 'Enfant',
                desc: 'Ajouter un enfant à la famille',
                color: 'from-orange-400 to-pink-500',
                border: 'hover:border-orange-300',
              },
            ].map(({ type, icon, label, desc, color, border }) => (
              <button
                key={type}
                onClick={() => handleChoose(type)}
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

        {/* ─── Étape 2 : Formulaire ─── */}
        {step === 'form' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            {/* Header formulaire */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => { setStep('choose'); setError(null); }}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                ←
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {memberType === 'PARENT' ? '👨‍👩‍👧 Nouveau parent' : '🧒 Nouvel enfant'}
                </h2>
                <p className="text-sm text-slate-500">
                  {memberType === 'PARENT'
                    ? 'Les champs marqués * sont obligatoires'
                    : 'L’enfant sera lié à votre famille automatiquement'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── FORMULAIRE PARENT ── */}
              {memberType === 'PARENT' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Prénom *</label>
                      <input
                        required
                        type="text"
                        placeholder="Jean"
                        value={parentForm.first_name}
                        onChange={(e) => setParentForm({ ...parentForm, first_name: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Nom *</label>
                      <input
                        required
                        type="text"
                        placeholder="Tremblay"
                        value={parentForm.last_name}
                        onChange={(e) => setParentForm({ ...parentForm, last_name: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                    <input
                      required
                      type="email"
                      placeholder="jean@exemple.com"
                      value={parentForm.email}
                      onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      placeholder="514-555-0123"
                      value={parentForm.phone}
                      onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Ville</label>
                      <input
                        type="text"
                        placeholder="Montréal"
                        value={parentForm.city}
                        onChange={(e) => setParentForm({ ...parentForm, city: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Province</label>
                      <select
                        value={parentForm.province}
                        onChange={(e) => setParentForm({ ...parentForm, province: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                      >
                        <option value="">—</option>
                        {['QC','ON','BC','AB','MB','SK','NS','NB','NL','PE','YT','NT','NU'].map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* ── FORMULAIRE ENFANT ── */}
              {memberType === 'CHILD' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Prénom *</label>
                      <input
                        required
                        type="text"
                        placeholder="Emma"
                        value={childForm.first_name}
                        onChange={(e) => setChildForm({ ...childForm, first_name: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Nom *</label>
                      <input
                        required
                        type="text"
                        placeholder="Tremblay"
                        value={childForm.last_name}
                        onChange={(e) => setChildForm({ ...childForm, last_name: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Âge *</label>
                      <input
                        required
                        type="number"
                        min={1}
                        max={25}
                        placeholder="8"
                        value={childForm.age}
                        onChange={(e) => setChildForm({ ...childForm, age: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Genre</label>
                      <select
                        value={childForm.gender}
                        onChange={(e) => setChildForm({ ...childForm, gender: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 bg-white"
                      >
                        <option value="">—</option>
                        {GENDER_OPTIONS.map((g) => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Sport principal</label>
                    <select
                      value={childForm.sport}
                      onChange={(e) => setChildForm({ ...childForm, sport: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 bg-white"
                    >
                      <option value="">Choisir un sport...</option>
                      {SPORT_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Notes / informations</label>
                    <textarea
                      rows={3}
                      placeholder="Allergies, besoins spéciaux, informations importantes..."
                      value={childForm.notes}
                      onChange={(e) => setChildForm({ ...childForm, notes: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-none"
                    />
                  </div>
                </>
              )}

              {/* Erreur */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  ⚠️ {error}
                </div>
              )}

              {/* Bouton soumettre */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl font-bold text-white text-sm transition-all duration-200 ${
                  memberType === 'PARENT'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                    : 'bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600'
                } disabled:opacity-60 disabled:cursor-not-allowed shadow-lg`}
              >
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

        {/* ─── Étape 3 : Succès ─── */}
        {step === 'success' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              ✅
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
              {memberType === 'PARENT' ? 'Compte créé !' : 'Enfant ajouté !'}
            </h2>
            <p className="text-slate-500 mb-2">
              <span className="font-semibold text-slate-800">{successName}</span> a bien été
              {memberType === 'PARENT' ? ' enregistré(e) comme parent.' : ' ajouté(e) à votre famille.'}
            </p>
            <p className="text-xs text-green-600 font-medium mb-8">
              🟢 Visible instantanément dans le dashboard admin
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setStep('choose');
                  setMemberType(null);
                  setError(null);
                  setParentForm({ first_name: '', last_name: '', email: '', phone: '', city: '', province: '' });
                  setChildForm({ first_name: '', last_name: '', age: '', gender: '', sport: '', notes: '' });
                }}
                className="w-full py-3 rounded-xl border-2 border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                + Ajouter un autre membre
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md"
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
