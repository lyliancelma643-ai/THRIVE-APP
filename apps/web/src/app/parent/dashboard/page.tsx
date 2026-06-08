'use client';

import { useAuthStore } from '@/stores/auth.store';

export default function ParentDashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {user?.firstName || 'Parent'} 👋
        </h1>
        <p className="text-gray-500 mt-1">Voici un résumé de l&apos;activité de vos enfants.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Enfants suivis', value: '2', icon: '👶', color: 'bg-blue-50 text-blue-600' },
          { label: 'Séances ce mois', value: '8', icon: '⏱️', color: 'bg-green-50 text-green-600' },
          { label: 'Rapports disponibles', value: '3', icon: '📊', color: 'bg-purple-50 text-purple-600' },
          { label: 'Messages non lus', value: '1', icon: '💬', color: 'bg-orange-50 text-orange-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${kpi.color} mb-4`}>
              <span className="text-xl">{kpi.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Activité récente</h2>
        <div className="space-y-4">
          {[
            { text: 'Séance 20 min complétée par Léa', time: 'Il y a 2h', icon: '✅' },
            { text: 'Nouveau rapport disponible pour Tom', time: 'Hier', icon: '📄' },
            { text: 'Message reçu de Coach Sarah', time: 'Il y a 2 jours', icon: '💬' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{item.text}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
