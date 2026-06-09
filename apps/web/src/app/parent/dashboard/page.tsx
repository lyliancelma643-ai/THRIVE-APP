'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useFamily, useChildren, useSessions } from '@thrive/shared';
import Link from 'next/link';

const avatarColors = ['#1a6fa8', '#e8a838', '#b44822', '#1ce783', '#0071eb'];

export default function ParentDashboardPage() {
  const { user } = useAuthStore();
  const { family, isLoading: familyLoading } = useFamily(user?.id);
  const { children, isLoading: childrenLoading } = useChildren(family?.id);
  const { sessions, isLoading: sessionsLoading } = useSessions();

  if (!user) return null;

  const isLoading = familyLoading || childrenLoading || sessionsLoading;

  const todaySessions = sessions.filter((s) => {
    if (!s.scheduled_at) return false;
    return new Date(s.scheduled_at).toDateString() === new Date().toDateString();
  });

  const upcomingSessions = sessions
    .filter((s) => s.scheduled_at && new Date(s.scheduled_at) > new Date())
    .slice(0, 6);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#04111d' }}>

      {/* ── HERO SECTION (style Netflix/Apple Fitness+) ── */}
      <section
        className="relative w-full flex flex-col justify-end px-12 pb-16"
        style={{
          height: '55vh',
          background: 'linear-gradient(to bottom, rgba(0,78,122,0.7) 0%, rgba(4,17,29,1) 100%), linear-gradient(135deg, #004e7a 0%, #003356 60%, #04111d 100%)',
        }}
      >
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#a7c4bc' }}>
            Bienvenue
          </p>
          <h1 className="text-5xl font-black mb-4 leading-tight" style={{ color: '#F7F5F2' }}>
            {user.firstName || 'Parent'} {user.lastName || ''}
          </h1>
          <p className="text-base mb-8" style={{ color: 'rgba(247,245,242,0.6)' }}>
            Famille {family?.name || '—'} · {children.length} enfant{children.length > 1 ? 's' : ''} · {todaySessions.length} séance{todaySessions.length > 1 ? 's' : ''} aujourd'hui
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/parent/children"
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all"
              style={{ backgroundColor: '#F7F5F2', color: '#04111d' }}
            >
              Voir mes enfants
            </Link>
            <Link
              href="/parent/programs"
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all border"
              style={{ borderColor: 'rgba(247,245,242,0.3)', color: '#F7F5F2', backgroundColor: 'rgba(247,245,242,0.1)' }}
            >
              Programmes
            </Link>
          </div>
        </div>

        {/* Indicateur en bas à droite */}
        <div className="absolute bottom-8 right-12 flex gap-6">
          {[
            { label: 'Enfants', value: isLoading ? '—' : children.length },
            { label: "Aujourd'hui", value: isLoading ? '—' : todaySessions.length },
            { label: 'Messages', value: 0 },
          ].map((stat) => (
            <div key={stat.label} className="text-right">
              <p className="text-3xl font-black" style={{ color: '#F7F5F2' }}>{stat.value}</p>
              <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(247,245,242,0.45)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTIONS EN RANGÉES (style Netflix) ── */}
      <div className="px-12 pb-20 space-y-14" style={{ backgroundColor: '#04111d' }}>

        {/* Rangée : Mes Enfants */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold" style={{ color: '#F7F5F2' }}>Mes Enfants</h2>
            <Link href="/parent/children" className="text-sm font-medium transition-colors hover:text-white" style={{ color: '#a7c4bc' }}>
              Voir tout &rsaquo;
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="flex-shrink-0 w-44 h-56 rounded-2xl animate-pulse" style={{ backgroundColor: '#0a2233' }} />
              ))
            ) : children.length === 0 ? (
              <Link
                href="/parent/children"
                className="flex-shrink-0 w-44 h-56 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all hover:border-white/40"
                style={{ borderColor: 'rgba(167,196,188,0.3)' }}
              >
                <span className="text-3xl">+</span>
                <span className="text-sm font-medium" style={{ color: '#a7c4bc' }}>Ajouter</span>
              </Link>
            ) : (
              children.map((child, index) => (
                <Link
                  href="/parent/children"
                  key={child.id}
                  className="flex-shrink-0 w-44 h-56 rounded-2xl flex flex-col justify-end p-5 relative overflow-hidden group transition-transform hover:scale-105"
                  style={{ backgroundColor: avatarColors[index % avatarColors.length] }}
                >
                  <div className="absolute top-5 left-5">
                    <span className="text-4xl font-black text-white/20 select-none">
                      {child.first_name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-20 rounded-b-2xl" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
                  <div className="relative z-10">
                    <p className="font-bold text-white text-base">{child.first_name}</p>
                    <p className="text-xs text-white/60">{child.last_name}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Rangée : Prochaines Séances */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold" style={{ color: '#F7F5F2' }}>Prochaines Séances</h2>
            <Link href="/parent/sessions" className="text-sm font-medium transition-colors hover:text-white" style={{ color: '#a7c4bc' }}>
              Voir tout &rsaquo;
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-shrink-0 w-72 h-36 rounded-2xl animate-pulse" style={{ backgroundColor: '#0a2233' }} />
              ))
            ) : upcomingSessions.length === 0 ? (
              <div
                className="flex-shrink-0 w-72 h-36 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#0a2233' }}
              >
                <p className="text-sm" style={{ color: 'rgba(247,245,242,0.4)' }}>Aucune séance à venir</p>
              </div>
            ) : (
              upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex-shrink-0 w-72 h-36 rounded-2xl p-5 flex flex-col justify-between transition-transform hover:scale-105"
                  style={{ backgroundColor: '#0a2233', border: '1px solid rgba(167,196,188,0.15)' }}
                >
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#a7c4bc' }}>Séance</p>
                    <p className="font-bold text-white">{session.title || 'Séance'}</p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'rgba(247,245,242,0.5)' }}>
                      {session.scheduled_at
                        ? new Date(session.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                        : '—'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Rangée : Programmes */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold" style={{ color: '#F7F5F2' }}>Programmes</h2>
            <Link href="/parent/programs" className="text-sm font-medium transition-colors hover:text-white" style={{ color: '#a7c4bc' }}>
              Voir tout &rsaquo;
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {[
              { title: 'Confiance en soi', sub: '8 séances · En cours', color: '#004e7a' },
              { title: 'Gestion des émotions', sub: '6 séances · Disponible', color: '#1a6fa8' },
              { title: 'Leadership', sub: '10 séances · Disponible', color: '#003356' },
              { title: 'Communication', sub: '5 séances · Disponible', color: '#005880' },
            ].map((prog, i) => (
              <Link
                href="/parent/programs"
                key={i}
                className="flex-shrink-0 w-64 h-40 rounded-2xl p-6 flex flex-col justify-between transition-transform hover:scale-105"
                style={{ backgroundColor: prog.color }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(167,196,188,0.2)' }}>
                  <span className="text-xl">🏆</span>
                </div>
                <div>
                  <p className="font-bold text-white text-base">{prog.title}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(247,245,242,0.55)' }}>{prog.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
