'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useFamily, useChildren } from '@thrive/shared';

export default function SelectProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { family } = useFamily(user?.id);
  const { children, isLoading } = useChildren(family?.id);
  const [showAddModal, setShowAddModal] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const avatarColors = [
    '#e8a838', '#b44822', '#1ce783', '#e50914', '#0071eb',
  ];

  const handleSelectParent = () => {
    router.push('/parent/dashboard');
  };

  const handleSelectChild = (childId: string) => {
    router.push(`/parent/children`);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-between py-12 px-4"
      style={{ backgroundColor: '#004e7a' }}
    >
      {/* Haut : Logo */}
      <div className="w-full flex justify-center">
        <span className="text-white font-black text-3xl tracking-tight">
          THRIVE<span style={{ color: '#e8a838' }}>.</span>
        </span>
      </div>

      {/* Centre : Titre + Profils */}
      <div className="flex flex-col items-center gap-14">
        <h1 className="text-white text-4xl font-bold tracking-tight">
          Qui regarde ?
        </h1>

        <div className="flex flex-wrap gap-8 justify-center items-end">

          {/* Profil Parent */}
          <button
            onClick={handleSelectParent}
            onMouseEnter={() => setHoveredId('parent')}
            onMouseLeave={() => setHoveredId(null)}
            className="flex flex-col items-center gap-4 outline-none"
          >
            <div
              className="relative w-32 h-32 rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                boxShadow: hoveredId === 'parent' ? '0 0 0 4px white' : 'none',
                transform: hoveredId === 'parent' ? 'scale(1.06)' : 'scale(1)',
              }}
            >
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: '#1a6fa8' }}
              >
                <span className="text-white font-black text-5xl select-none">
                  {user?.firstName?.[0]?.toUpperCase() || 'P'}
                </span>
              </div>
            </div>
            <span
              className="text-sm font-semibold tracking-wide transition-colors duration-200"
              style={{ color: hoveredId === 'parent' ? '#ffffff' : '#8ab4cc' }}
            >
              {user?.firstName || 'Parent'}
            </span>
          </button>

          {/* Profils Enfants */}
          {!isLoading && children.map((child, index) => (
            <button
              key={child.id}
              onClick={() => handleSelectChild(child.id)}
              onMouseEnter={() => setHoveredId(child.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="flex flex-col items-center gap-4 outline-none"
            >
              <div
                className="relative w-32 h-32 rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  boxShadow: hoveredId === child.id ? '0 0 0 4px white' : 'none',
                  transform: hoveredId === child.id ? 'scale(1.06)' : 'scale(1)',
                }}
              >
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: avatarColors[index % avatarColors.length] }}
                >
                  <span className="text-white font-black text-5xl select-none">
                    {child.first_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              </div>
              <span
                className="text-sm font-semibold tracking-wide transition-colors duration-200"
                style={{ color: hoveredId === child.id ? '#ffffff' : '#8ab4cc' }}
              >
                {child.first_name}
              </span>
            </button>
          ))}

          {/* Skeleton loading */}
          {isLoading && [1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-2xl animate-pulse" style={{ backgroundColor: '#005f94' }} />
              <div className="w-20 h-3 rounded animate-pulse" style={{ backgroundColor: '#005f94' }} />
            </div>
          ))}

          {/* Bouton Ajouter */}
          <button
            onClick={() => setShowAddModal(true)}
            onMouseEnter={() => setHoveredId('add')}
            onMouseLeave={() => setHoveredId(null)}
            className="flex flex-col items-center gap-4 outline-none"
          >
            <div
              className="w-32 h-32 rounded-2xl border-2 flex items-center justify-center transition-all duration-200"
              style={{
                borderColor: hoveredId === 'add' ? '#ffffff' : '#8ab4cc',
                backgroundColor: hoveredId === 'add' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                transform: hoveredId === 'add' ? 'scale(1.06)' : 'scale(1)',
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke={hoveredId === 'add' ? '#ffffff' : '#8ab4cc'}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span
              className="text-sm font-semibold tracking-wide transition-colors duration-200"
              style={{ color: hoveredId === 'add' ? '#ffffff' : '#8ab4cc' }}
            >
              Ajouter
            </span>
          </button>

        </div>
      </div>

      {/* Bas : Bouton Déconnexion */}
      <button
        onClick={handleSignOut}
        className="text-sm font-semibold tracking-widest uppercase px-8 py-3 rounded-xl border transition-all duration-200 hover:bg-white hover:text-[#004e7a]"
        style={{ borderColor: '#8ab4cc', color: '#8ab4cc' }}
      >
        Déconnexion
      </button>

      {/* Modal Ajouter */}
      {showAddModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div className="rounded-2xl p-8 w-full max-w-sm shadow-2xl" style={{ backgroundColor: '#003a5c' }}>
            <h2 className="text-white text-xl font-bold mb-6">Ajouter une personne</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: '#8ab4cc' }}>
                  Prénom
                </label>
                <input
                  type="text"
                  placeholder="Prénom de l'enfant"
                  className="w-full rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 outline-none"
                  style={{ backgroundColor: '#005880', border: '1px solid #1a6fa8' }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: '#8ab4cc' }}>
                  Nom
                </label>
                <input
                  type="text"
                  placeholder="Nom de l'enfant"
                  className="w-full rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 outline-none"
                  style={{ backgroundColor: '#005880', border: '1px solid #1a6fa8' }}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: '#005880', color: '#8ab4cc' }}
              >
                Annuler
              </button>
              <button
                onClick={() => { setShowAddModal(false); router.push('/parent/children'); }}
                className="flex-1 py-3 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: '#e8a838' }}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
