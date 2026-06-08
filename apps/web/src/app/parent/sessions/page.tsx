'use client';

export default function ParentSessionsPage() {
  const sessions = [
    { child: 'Léa', date: '08/06/2026', duration: '20 min', type: 'Mobilité', status: 'Complété', score: 92 },
    { child: 'Tom', date: '07/06/2026', duration: '20 min', type: 'Force', status: 'Complété', score: 78 },
    { child: 'Léa', date: '05/06/2026', duration: '20 min', type: 'Cardio', status: 'Complété', score: 85 },
    { child: 'Tom', date: '03/06/2026', duration: '20 min', type: 'Mobilité', status: 'Manqué', score: 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Séances 20 min</h1>
        <p className="text-gray-500 mt-1">Historique des séances de vos enfants.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Enfant</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Date</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Type</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Durée</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Statut</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sessions.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.child}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{s.date}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{s.type}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{s.duration}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    s.status === 'Complété' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                  {s.score > 0 ? `${s.score}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
