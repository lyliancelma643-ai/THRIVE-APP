'use client';

export default function ParentChildrenPage() {
  const children = [
    { name: 'Léa Dupont', age: 9, program: 'Programme Bronze', progress: 68, coach: 'Sarah Martin', status: 'Actif' },
    { name: 'Tom Dupont', age: 12, program: 'Programme Argent', progress: 45, coach: 'Marc Leblanc', status: 'Actif' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes Enfants</h1>
        <p className="text-gray-500 mt-1">Suivi individuel de chaque enfant.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children.map((child) => (
          <div key={child.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-2xl">
                👶
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{child.name}</h2>
                <p className="text-sm text-gray-500">{child.age} ans · {child.program}</p>
              </div>
              <span className="ml-auto text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">
                {child.status}
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progression</span>
                <span>{child.progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-brand-primary h-2 rounded-full transition-all"
                  style={{ width: `${child.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>🎯</span>
              <span>Coach : <strong>{child.coach}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
