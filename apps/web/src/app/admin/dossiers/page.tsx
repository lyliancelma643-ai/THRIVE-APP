'use client';

// Admin / super admin — suivi des dossiers des coachs supervisés (ou tous,
// pour le super admin). Bouton d'envoi manuel des rappels d'incomplétude.

import { useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { DossierTable } from '@/components/coach/DossierTable';

export default function AdminDossiersPage() {
  const { user } = useAuthStore();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const sendReminders = async () => {
    setSending(true);
    setResult(null);
    const { data, error } = await supabase.rpc('notify_incomplete_dossiers', { p_days: 7 });
    setSending(false);
    if (error) setResult(`Erreur : ${error.message}`);
    else setResult(`${data ?? 0} rappel(s) envoyé(s) aux coachs concernés.`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Suivi des dossiers</h1>
          <p className="text-slate-500">
            {isSuper
              ? 'Vue globale — tous les coachs et tous les athlètes.'
              : 'Les dossiers des coachs que vous supervisez.'}
          </p>
        </div>
        <div className="text-right">
          <button
            onClick={sendReminders}
            disabled={sending}
            className="px-4 py-2.5 rounded-full bg-navy-600 hover:bg-navy-700 text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
          >
            {sending ? 'Envoi…' : 'Envoyer les rappels (>7 j)'}
          </button>
          {result && <p className="text-xs text-slate-500 mt-2">{result}</p>}
        </div>
      </div>

      <DossierTable basePath="/admin/dossiers" showAdmin={isSuper} />
    </div>
  );
}
