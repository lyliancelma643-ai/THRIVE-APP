'use client';

export default function ParentProgramPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#F7F5F2]">Programme</h1>
        <p className="text-[#a7c4bc] mt-1">Les programmes actifs de vos enfants.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            child: 'Léa',
            program: 'Programme Bronze',
            weeks: 12,
            currentWeek: 8,
            nextSession: 'Lundi 10/06 à 17h',
            objectives: ['Améliorer la mobilité', 'Renforcement musculaire', 'Coordination'],
          },
          {
            child: 'Tom',
            program: 'Programme Argent',
            weeks: 16,
            currentWeek: 7,
            nextSession: 'Mercredi 12/06 à 15h',
            objectives: ['Développer la force', 'Endurance cardio', 'Agilité'],
          },
        ].map((p) => (
          <div key={p.child} className="bg-white/10 backdrop-blur-md rounded-xl border border-[#a7c4bc]/10 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[#F7F5F2]">{p.program}</h2>
                <p className="text-sm text-[#a7c4bc]">{p.child} · Semaine {p.currentWeek}/{p.weeks}</p>
              </div>
              <span className="text-2xl">🏆</span>
            </div>

            <div>
              <div className="flex justify-between text-xs text-[#a7c4bc] mb-2">
                <span>Avancement global</span>
                <span>{Math.round((p.currentWeek / p.weeks) * 100)}%</span>
              </div>
              <div className="w-full bg-white/10 backdrop-blur-md/10 rounded-full h-2">
                <div
                  className="bg-white/10 backdrop-blur-md/10 h-2 rounded-full"
                  style={{ width: `${(p.currentWeek / p.weeks) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#a7c4bc] uppercase tracking-wider mb-2">Objectifs</p>
              <ul className="space-y-1">
                {p.objectives.map((o) => (
                  <li key={o} className="flex items-center gap-2 text-sm text-[#F7F5F2]">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/10 backdrop-blur-md/10 flex-shrink-0"></span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-gray-50">
              <p className="text-xs text-[#a7c4bc]/70">Prochaine séance</p>
              <p className="text-sm font-semibold text-[#F7F5F2] mt-0.5">{p.nextSession}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
