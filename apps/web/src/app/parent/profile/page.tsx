'use client';

import { useAuthStore } from '@/stores/auth.store';

export default function ParentProfilePage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
        <p className="text-gray-500 mt-1">Gérez vos informations personnelles.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center text-2xl font-bold text-brand-primary">
            {user?.firstName?.[0] || 'P'}{user?.lastName?.[0] || ''}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">
              {user?.firstName || 'Parent'} {user?.lastName || ''}
            </h2>
            <p className="text-sm text-gray-500">{user?.email || 'parent@example.com'}</p>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
              Parent
            </span>
          </div>
        </div>

        {/* Info fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Prénom', value: user?.firstName || '—' },
            { label: 'Nom', value: user?.lastName || '—' },
            { label: 'Email', value: user?.email || '—' },
            { label: 'Téléphone', value: '—' },
          ].map((field) => (
            <div key={field.label}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{field.label}</p>
              <p className="text-sm text-gray-800 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100">
                {field.value}
              </p>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-50">
          <button className="bg-brand-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-primary/90 transition-colors">
            Modifier le profil
          </button>
        </div>
      </div>
    </div>
  );
}
