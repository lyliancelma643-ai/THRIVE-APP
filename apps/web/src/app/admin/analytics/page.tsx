'use client';

import { useState } from 'react';
import { useAnalytics } from '@thrive/shared';

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aoû',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
};

function MiniBarChart({ data, color = '#000' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((v, i) => (
        <div
          key={i}
          style={{ height: `${Math.round((v / max) * 100)}%`, backgroundColor: color, opacity: v === 0 ? 0.15 : 1 }}
          className="flex-1 rounded-t min-h-[2px] transition-all"
        />
      ))}
    </div>
  );
}

function KPICard({ icon, label, value, sub }: { icon: string; label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#a7c4bc] mb-1">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
          {sub && <p className="text-xs text-[#a7c4bc]/70 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { kpis, monthlyActivity, coachPerformance, childProgress, badgeDistribution, isLoading, exportSessionsCSV } = useAnalytics();
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'coaches' | 'children' | 'badges'>('overview');

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await exportSessionsCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thrive-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-[#a7c4bc]">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  const sessionTrend = monthlyActivity.map((m) => m.sessions);
  const msgTrend = monthlyActivity.map((m) => m.messages);
  const completionRate = kpis && kpis.total_sessions > 0
    ? Math.round((kpis.completed_sessions / kpis.total_sessions) * 100)
    : 0;

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">📊 Analytics</h1>
          <p className="text-[#a7c4bc] mt-1">Vue d'ensemble de la plateforme THRIVE</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-[#a7c4bc] text-white rounded-xl px-5 py-3 font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
        >
          {exporting ? '⏳ Export...' : '⬇️ Export CSV séances'}
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['overview', 'coaches', 'children', 'badges'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
              activeTab === tab ? 'bg-[#a7c4bc] text-white' : 'bg-white/10 backdrop-blur-md text-[#a7c4bc] hover:bg-[#a7c4bc]/20'
            }`}
          >
            {{ overview: '🏠 Vue globale', coaches: '🎯 Coaches', children: '🧒 Enfants', badges: '🏅 Badges' }[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KPICard icon="👨‍🏫" label="Coaches" value={kpis?.total_coaches ?? 0} />
            <KPICard icon="👨‍👩‍👧‍👦" label="Familles" value={kpis?.total_families ?? 0} />
            <KPICard icon="🧒" label="Enfants" value={kpis?.total_children ?? 0} />
            <KPICard icon="🏆" label="Programmes" value={kpis?.total_programs ?? 0} sub={`${kpis?.active_programs ?? 0} actifs`} />
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <KPICard icon="📅" label="Séances totales" value={kpis?.total_sessions ?? 0} sub={`${kpis?.sessions_this_month ?? 0} ce mois`} />
            <KPICard icon="✅" label="Taux complétion" value={`${completionRate}%`} sub={`${kpis?.completed_sessions ?? 0} complétées`} />
            <KPICard icon="🏅" label="Badges attribués" value={kpis?.total_badges_awarded ?? 0} />
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Activité sur 12 mois</h2>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-[#a7c4bc] mb-2">Séances</p>
                <MiniBarChart data={sessionTrend} color="#000" />
                <div className="flex justify-between mt-1">
                  {monthlyActivity.map((m) => (
                    <span key={m.month} className="text-xs text-gray-300 flex-1 text-center">
                      {MONTH_LABELS[m.month.slice(5, 7)]}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-[#a7c4bc] mb-2">Messages</p>
                <MiniBarChart data={msgTrend} color="#3B82F6" />
                <div className="flex justify-between mt-1">
                  {monthlyActivity.map((m) => (
                    <span key={m.month} className="text-xs text-gray-300 flex-1 text-center">
                      {MONTH_LABELS[m.month.slice(5, 7)]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'coaches' && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#a7c4bc]/10">
            <h2 className="text-lg font-bold">Performance des coaches</h2>
          </div>
          {coachPerformance.length === 0 ? (
            <div className="p-12 text-center text-[#a7c4bc]/70">Aucun coach enregistré</div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#a7c4bc]/20">
                <tr>
                  {['Coach', 'Programmes', 'Séances', 'Complétées', 'Taux', 'Messages', 'Badges'].map((h) => (
                    <th key={h} className="text-left text-xs text-[#a7c4bc] font-semibold px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coachPerformance.map((c, i) => (
                  <tr key={c.coach_id} className={`border-t border-gray-50 ${ i === 0 ? 'bg-yellow-50/50' : '' }`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#a7c4bc] text-white flex items-center justify-center text-xs font-bold">
                          {c.first_name[0]}{c.last_name[0]}
                        </div>
                        <span className="font-medium">{c.first_name} {c.last_name}</span>
                        {i === 0 && <span className="text-xs">🥇</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{c.total_programs}</td>
                    <td className="px-6 py-4 text-sm">{c.total_sessions}</td>
                    <td className="px-6 py-4 text-sm text-green-600 font-medium">{c.completed_sessions}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white/10 backdrop-blur-md/10 rounded-full h-2 w-16">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${c.completion_rate ?? 0}%` }} />
                        </div>
                        <span className="text-sm font-medium">{c.completion_rate ?? 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{c.total_messages}</td>
                    <td className="px-6 py-4 text-sm">{c.badges_awarded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'children' && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#a7c4bc]/10">
            <h2 className="text-lg font-bold">Progression des enfants</h2>
          </div>
          {childProgress.length === 0 ? (
            <div className="p-12 text-center text-[#a7c4bc]/70">Aucun enfant enregistré</div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#a7c4bc]/20">
                <tr>
                  {['Enfant', 'Âge', 'Famille', 'Séances', 'Complétées', 'Badges', 'Dernière séance'].map((h) => (
                    <th key={h} className="text-left text-xs text-[#a7c4bc] font-semibold px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {childProgress.map((child) => (
                  <tr key={child.child_id} className="border-t border-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                          {child.first_name[0]}
                        </div>
                        <span className="font-medium">{child.first_name} {child.last_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{child.age ? `${child.age} ans` : '—'}</td>
                    <td className="px-6 py-4 text-sm text-[#a7c4bc]">{child.family_name}</td>
                    <td className="px-6 py-4 text-sm">{child.total_sessions}</td>
                    <td className="px-6 py-4"><span className="text-sm font-medium text-green-600">{child.completed_sessions}</span></td>
                    <td className="px-6 py-4">
                      {child.badges_count > 0 ? (
                        <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-1 rounded-full">🏅 {child.badges_count}</span>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#a7c4bc]/70">
                      {child.last_session_at
                        ? new Date(child.last_session_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="grid grid-cols-3 gap-4">
          {badgeDistribution.length === 0 ? (
            <div className="col-span-3 bg-white/10 backdrop-blur-md rounded-2xl p-12 text-center text-[#a7c4bc]/70">Aucun badge</div>
          ) : badgeDistribution.map((badge, i) => (
            <div key={badge.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{badge.icon ?? '🏅'}</span>
                  <div>
                    <p className="font-bold">{badge.name}</p>
                    {badge.category && <p className="text-xs text-[#a7c4bc]/70 capitalize">{badge.category}</p>}
                  </div>
                </div>
                {i === 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold">Top 🥇</span>}
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-2xl font-bold">{badge.awarded_count}</p>
                  <p className="text-xs text-[#a7c4bc]/70">attributions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{badge.unique_children}</p>
                  <p className="text-xs text-[#a7c4bc]/70">enfants uniques</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
