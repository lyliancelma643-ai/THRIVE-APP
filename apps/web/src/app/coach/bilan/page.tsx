'use client';

// Espace coach — page « Bilans ».
// Liste des athlètes assignés ; au clic, la fiche intégrale (carte d'identité)
// devient éditable. L'éditeur écrit dans `athlete_identity` (onConflict child_id)
// et la page bilan du parent y est abonnée en temps réel → tout s'actualise live.

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { fetchAssignedChildren, childAge, AssignedChild } from '@/lib/coach';
import { AthleteIdentityEditor } from '@/components/AthleteIdentityEditor';

export default function CoachBilanPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<AssignedChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setChildren(await fetchAssignedChildren(user.id));
      setLoading(false);
    })();
  }, [user?.id]);

  const selected = children.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900 mb-2">Bilans</h1>
      <p className="text-navy-600/70 mb-8">
        Crée, modifie ou supprime chaque section de la carte d&apos;identité de tes athlètes. Tout
        s&apos;actualise en direct sur l&apos;espace parent.
      </p>

      {loading ? (
        <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-navy-50 animate-pulse" />
            ))}
          </div>
          <div className="h-96 rounded-2xl bg-navy-50 animate-pulse" />
        </div>
      ) : children.length === 0 ? (
        <p className="text-sm text-navy-600/60 p-6 rounded-2xl bg-white shadow-card">
          Aucun athlète assigné pour l&apos;instant.
        </p>
      ) : (
        <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
          {/* ── Liste des athlètes ── */}
          <div className="space-y-2 lg:sticky lg:top-8">
            <p className="text-xs font-bold uppercase tracking-wide text-navy-400 px-1 mb-1">
              {children.length} athlète{children.length > 1 ? 's' : ''}
            </p>
            {children.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-navy-900 text-white shadow-card'
                      : 'bg-white text-navy-900 shadow-card hover:shadow-card-hover'
                  }`}
                >
                  <span
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${
                      active ? 'bg-sun text-navy-900' : 'bg-sun/90 text-navy-900'
                    }`}
                  >
                    {c.first_name[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold truncate">
                      {c.first_name} {c.last_name ?? ''}
                    </span>
                    <span className={`block text-xs truncate ${active ? 'text-white/60' : 'text-navy-600/60'}`}>
                      {childAge(c.date_of_birth) ?? '–'} ans · {c.sport ?? 'Hockey'}
                    </span>
                  </span>
                  <span className={`text-sm shrink-0 ${active ? 'text-sun' : 'text-navy-300'}`}>
                    {active ? '◈' : '→'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Fiche éditable de l'athlète sélectionné ── */}
          <div>
            {selected ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-navy-900">
                      Fiche de {selected.first_name} {selected.last_name ?? ''}
                    </h2>
                    <p className="text-sm text-navy-600/70 mt-0.5">
                      {childAge(selected.date_of_birth) ?? '–'} ans · {selected.sport ?? 'Hockey'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-3 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Synchronisé en direct avec l&apos;espace parent
                  </span>
                </div>
                <AthleteIdentityEditor
                  key={selected.id}
                  childId={selected.id}
                  childName={selected.first_name}
                />
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-10 rounded-2xl border-2 border-dashed border-navy-200 bg-white/50">
                <div className="w-14 h-14 rounded-full bg-navy-50 flex items-center justify-center text-2xl text-navy-400 mb-4">
                  ◈
                </div>
                <p className="font-display text-lg font-semibold text-navy-900 mb-1">
                  Sélectionne un athlète
                </p>
                <p className="text-sm text-navy-600/60 max-w-xs">
                  Choisis un enfant dans la liste pour ouvrir et modifier l&apos;intégralité de sa
                  carte d&apos;identité.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
