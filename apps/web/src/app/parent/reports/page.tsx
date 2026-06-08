'use client';

export default function ParentReportsPage() {
  const reports = [
    { child: 'Léa', title: 'Bilan mensuel – Mai 2026', date: '01/06/2026', type: 'Mensuel', new: true },
    { child: 'Tom', title: 'Bilan mensuel – Mai 2026', date: '01/06/2026', type: 'Mensuel', new: true },
    { child: 'Léa', title: 'Rapport de progression – Avril 2026', date: '02/05/2026', type: 'Progression', new: false },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
        <p className="text-gray-500 mt-1">Bilans et rapports de progression.</p>
      </div>

      <div className="space-y-4">
        {reports.map((report, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-xl flex-shrink-0">
              📄
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 text-sm">{report.title}</h3>
                {report.new && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Nouveau</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{report.child} · {report.type} · {report.date}</p>
            </div>
            <button className="flex-shrink-0 text-sm font-medium text-brand-primary hover:underline">
              Voir le rapport →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
