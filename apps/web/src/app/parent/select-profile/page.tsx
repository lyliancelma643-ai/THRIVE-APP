'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useFamily } from '@thrive/shared';
import { useChildren, CreateChildDTO } from '@thrive/shared';

const AVATAR_COLORS = ['#e8a838', '#b44822', '#1ce783', '#e50914', '#0071eb', '#8a2be2'];

const SPORTS = [
  'Football', 'Basketball', 'Tennis', 'Natation', 'Gymnastique',
  'Athlétisme', 'Volleyball', 'Hockey', 'Rugby', 'Arts martiaux',
  'Danse', 'Cyclisme', 'Ski', 'Autre',
];

function calcAge(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export default function SelectProfilePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { family } = useFamily(user?.id);
  const { children, isLoading, createChild } = useChildren(family?.id);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Formulaire
  const [form, setForm] = useState<{
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    sport: string;
    notes: string;
  }>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    sport: '',
    notes: '',
  });

  const handleField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleAdd = async () => {
    setFormError('');
    if (!form.first_name.trim()) return setFormError('Le prénom est requis');
    if (!form.last_name.trim()) return setFormError('Le nom est requis');
    if (!form.date_of_birth) return setFormError('La date de naissance est requise');
    if (!form.sport) return setFormError('Le sport est requis');
    try {
      setSaving(true);
      await createChild({
        first_name: form.first_name,
        last_name: form.last_name,
        date_of_birth: form.date_of_birth,
        gender: form.gender || undefined,
        sport: form.sport,
        notes: form.notes || undefined,
      } as CreateChildDTO);
      setShowModal(false);
      setForm({ first_name: '', last_name: '', date_of_birth: '', gender: '', sport: '', notes: '' });
    } catch (err: any) {
      setFormError(err.message ?? 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: '#005880',
    border: '1px solid #1a6fa8',
    color: 'white',
  };

  const labelStyle = { color: '#8ab4cc', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: '6px', display: 'block' };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#004e7a' }}>

      {/* Logo */}
      <div className="absolute top-8 left-10">
        <span className="text-white font-black text-3xl tracking-tight">
          THRIVE<span style={{ color: '#e8a838' }}>.</span>
        </span>
      </div>

      <h1 className="text-white text-4xl font-bold mb-14 tracking-tight">Qui regarde ?</h1>

      {/* Grille profils */}
      <div className="flex flex-wrap gap-8 justify-center items-end">

        {/* Profil Parent */}
        <button
          onClick={() => router.push('/parent/dashboard')}
          onMouseEnter={() => setHoveredId('parent')}
          onMouseLeave={() => setHoveredId(null)}
          className="flex flex-col items-center gap-4 outline-none"
        >
          <div
            className="relative w-32 h-32 rounded-xl overflow-hidden transition-all duration-200"
            style={{
              boxShadow: hoveredId === 'parent' ? '0 0 0 4px white' : 'none',
              transform: hoveredId === 'parent' ? 'scale(1.06)' : 'scale(1)',
              backgroundColor: '#1a6fa8',
            }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white font-black text-5xl select-none">
                {user?.firstName?.[0]?.toUpperCase() || 'P'}
              </span>
            </div>
          </div>
          <span className="text-sm font-semibold tracking-wide transition-colors duration-200"
            style={{ color: hoveredId === 'parent' ? '#ffffff' : '#8ab4cc' }}>
            {user?.firstName || 'Parent'}
          </span>
        </button>

        {/* Profils Enfants depuis Supabase */}
        {!isLoading && children.map((child, i) => (
          <button
            key={child.id}
            onClick={() => router.push('/parent/children')}
            onMouseEnter={() => setHoveredId(child.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="flex flex-col items-center gap-4 outline-none"
          >
            <div
              className="relative w-32 h-32 rounded-xl overflow-hidden transition-all duration-200"
              style={{
                boxShadow: hoveredId === child.id ? '0 0 0 4px white' : 'none',
                transform: hoveredId === child.id ? 'scale(1.06)' : 'scale(1)',
                backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
              }}
            >
              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                <span className="text-white font-black text-4xl select-none">
                  {child.first_name[0].toUpperCase()}
                </span>
                {child.sport && (
                  <span className="text-white/70 text-xs font-medium">{child.sport}</span>
                )}
              </div>
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold tracking-wide block transition-colors duration-200"
                style={{ color: hoveredId === child.id ? '#ffffff' : '#8ab4cc' }}>
                {child.first_name}
              </span>
              {child.date_of_birth && (
                <span className="text-xs" style={{ color: '#6a9ab5' }}>
                  {calcAge(child.date_of_birth)} ans
                </span>
              )}
            </div>
          </button>
        ))}

        {/* Skeletons pendant le chargement */}
        {isLoading && [1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-xl animate-pulse" style={{ backgroundColor: '#005f94' }} />
            <div className="w-20 h-3 rounded animate-pulse" style={{ backgroundColor: '#005f94' }} />
          </div>
        ))}

        {/* Bouton Ajouter */}
        <button
          onClick={() => setShowModal(true)}
          onMouseEnter={() => setHoveredId('add')}
          onMouseLeave={() => setHoveredId(null)}
          className="flex flex-col items-center gap-4 outline-none"
        >
          <div
            className="w-32 h-32 rounded-xl border-2 flex items-center justify-center transition-all duration-200"
            style={{
              borderColor: hoveredId === 'add' ? '#ffffff' : '#8ab4cc',
              backgroundColor: hoveredId === 'add' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
              transform: hoveredId === 'add' ? 'scale(1.06)' : 'scale(1)',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke={hoveredId === 'add' ? '#ffffff' : '#8ab4cc'}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-wide transition-colors duration-200"
            style={{ color: hoveredId === 'add' ? '#ffffff' : '#8ab4cc' }}>
            Ajouter
          </span>
        </button>
      </div>

      {/* ── MODAL AJOUT ENFANT ── */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="rounded-2xl p-8 w-full max-w-md shadow-2xl my-auto"
            style={{ backgroundColor: '#003a5c' }}
          >
            <h2 className="text-white text-xl font-bold mb-1">Ajouter un enfant</h2>
            <p className="text-sm mb-6" style={{ color: '#8ab4cc' }}>
              Les informations seront visibles par les coachs et administrateurs.
            </p>

            <div className="space-y-4">
              {/* Prénom + Nom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Prénom *</label>
                  <input type="text" placeholder="Emma" value={form.first_name}
                    onChange={(e) => handleField('first_name', e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-white/20"
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Nom *</label>
                  <input type="text" placeholder="Dupont" value={form.last_name}
                    onChange={(e) => handleField('last_name', e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-white/20"
                    style={inputStyle} />
                </div>
              </div>

              {/* Date de naissance */}
              <div>
                <label style={labelStyle}>Date de naissance *</label>
                <input type="date" value={form.date_of_birth}
                  onChange={(e) => handleField('date_of_birth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  style={{ ...inputStyle, colorScheme: 'dark' }} />
              </div>

              {/* Genre */}
              <div>
                <label style={labelStyle}>Genre</label>
                <div className="flex gap-2">
                  {['Garçon', 'Fille', 'Autre'].map((g) => (
                    <button key={g} type="button"
                      onClick={() => handleField('gender', g)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        backgroundColor: form.gender === g ? '#e8a838' : '#005880',
                        color: form.gender === g ? '#003a5c' : '#8ab4cc',
                        border: '1px solid',
                        borderColor: form.gender === g ? '#e8a838' : '#1a6fa8',
                      }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sport */}
              <div>
                <label style={labelStyle}>Sport pratiqué *</label>
                <select value={form.sport}
                  onChange={(e) => handleField('sport', e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  style={{ ...inputStyle, colorScheme: 'dark' }}>
                  <option value="" disabled>Choisir un sport...</option>
                  {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes pour le coach</label>
                <textarea value={form.notes}
                  onChange={(e) => handleField('notes', e.target.value)}
                  placeholder="Allergies, blessures, objectifs..."
                  rows={3}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-white/20 resize-none"
                  style={inputStyle} />
              </div>
            </div>

            {formError && (
              <p className="text-sm mt-4 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(229,9,20,0.15)', color: '#ff8a8a' }}>
                {formError}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setFormError(''); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ backgroundColor: '#005880', color: '#8ab4cc' }}>
                Annuler
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#e8a838', color: '#003a5c' }}>
                {saving ? 'Enregistrement...' : 'Ajouter l\'enfant'}
              </button>
            </div>

            <p className="text-center text-xs mt-4" style={{ color: '#6a9ab5' }}>
              L'enfant sera automatiquement lié à votre compte parent.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
