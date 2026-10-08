'use client';

import { useAuthStore } from '@/stores/auth.store';
import { DeleteAccountSection } from '@/components/account/DeleteAccountSection';

// Profil coach : coordonnées en lecture + suppression de compte (Apple 5.1.1(v)).
export default function CoachProfilePage() {
  const { user } = useAuthStore();
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-extrabold text-navy-600">Mon profil</h1>
      {user && (
        <p className="mt-2 text-sm text-navy-600/80">
          {user.firstName} {user.lastName} · {user.email}
        </p>
      )}
      <section className="mt-8 rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-navy-600/70 mb-3">Mes données</h2>
        <DeleteAccountSection tone="light" />
      </section>
    </div>
  );
}
