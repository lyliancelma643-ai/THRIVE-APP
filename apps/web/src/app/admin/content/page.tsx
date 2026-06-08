'use client';

import { useState } from 'react';

type ContentType = 'article' | 'video' | 'conseil';
type ContentCategory = 'nutrition' | 'entrainement' | 'mental' | 'recuperation' | 'parents' | 'technique';
type TargetRole = 'coach' | 'parent' | 'both';

interface ContentItem {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  category: ContentCategory;
  type: ContentType;
  published: boolean;
  pinned: boolean;
  views: number;
  read_time_minutes: number;
  target_roles: TargetRole[];
  created_at: string;
}

const MOCK_ITEMS: ContentItem[] = [
  {
    id: '1',
    title: 'Comment optimiser la récupération après l\'effort',
    excerpt: 'Les meilleures stratégies pour récupérer rapidement et efficacement après une séance intense.',
    body: '',
    category: 'recuperation',
    type: 'article',
    published: true,
    pinned: true,
    views: 142,
    read_time_minutes: 5,
    target_roles: ['coach', 'parent'],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: '2',
    title: 'Nutrition pré-entraînement : quoi manger et quand',
    excerpt: 'Guide complet sur l\'alimentation avant une séance de sport pour maximiser les performances.',
    body: '',
    category: 'nutrition',
    type: 'conseil',
    published: true,
    pinned: false,
    views: 89,
    read_time_minutes: 3,
    target_roles: ['both'],
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: '3',
    title: 'Vidéo : Technique de course à pied',
    excerpt: 'Analyse biomécanique de la foulée et exercices correctifs.',
    body: '',
    category: 'technique',
    type: 'video',
    published: false,
    pinned: false,
    views: 0,
    read_time_minutes: 8,
    target_roles: ['coach'],
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

const CATEGORIES: { value: ContentCategory; label: string; emoji: string }[] = [
  { value: 'nutrition', label: 'Nutrition', emoji: '🥗' },
  { value: 'entrainement', label: 'Entraînement', emoji: '🏋️' },
  { value: 'mental', label: 'Mental', emoji: '🧠' },
  { value: 'recuperation', label: 'Récupération', emoji: '😴' },
  { value: 'parents', label: 'Parents', emoji: '👨‍👩‍👧' },
  { value: 'technique', label: 'Technique', emoji: '🎯' },
];

const TYPE_LABELS: Record<ContentType, { label: string; color: string }> = {
  article: { label: 'Article', color: '#3b82f6' },
  video: { label: 'Vidéo', color: '#f59e0b' },
  conseil: { label: 'Conseil', color: '#10b981' },
};

export default function ContentAdminPage() {
  const [items, setItems] = useState<ContentItem[]>(MOCK_ITEMS);
  const [activeTab, setActiveTab] = useState<'all' | ContentCategory>('all');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');

  // Form state
  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    body: '',
    category: 'entrainement' as ContentCategory,
    type: 'article' as ContentType,
    read_time_minutes: 3,
    target_roles: ['both'] as TargetRole[],
    published: false,
    pinned: false,
  });

  function openCreate() {
    setEditItem(null);
    setForm({ title: '', excerpt: '', body: '', category: 'entrainement', type: 'article', read_time_minutes: 3, target_roles: ['both'], published: false, pinned: false });
    setShowModal(true);
  }

  function openEdit(item: ContentItem) {
    setEditItem(item);
    setForm({
      title: item.title,
      excerpt: item.excerpt,
      body: item.body,
      category: item.category,
      type: item.type,
      read_time_minutes: item.read_time_minutes,
      target_roles: item.target_roles,
      published: item.published,
      pinned: item.pinned,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.title.trim()) return;
    if (editItem) {
      setItems((prev) => prev.map((i) => i.id === editItem.id ? { ...i, ...form, updated_at: new Date().toISOString() } : i));
    } else {
      const newItem: ContentItem = {
        id: Date.now().toString(),
        ...form,
        views: 0,
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [newItem, ...prev]);
    }
    setShowModal(false);
  }

  function handleDelete(id: string) {
    if (confirm('Supprimer ce contenu définitivement ?')) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  }

  function togglePublish(id: string) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, published: !i.published } : i));
  }

  function togglePin(id: string) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, pinned: !i.pinned } : i));
  }

  const filtered = items.filter((i) => {
    if (activeTab !== 'all' && i.category !== activeTab) return false;
    if (filterType !== 'all' && i.type !== filterType) return false;
    if (filterStatus === 'published' && !i.published) return false;
    if (filterStatus === 'draft' && i.published) return false;
    if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: items.length,
    published: items.filter((i) => i.published).length,
    drafts: items.filter((i) => !i.published).length,
    totalViews: items.reduce((acc, i) => acc + i.views, 0),
  };

  return (
    <div style={styles.page}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Bibliothèque de contenu</h1>
          <p style={styles.pageSubtitle}>Gérez les ressources partagées avec coaches et parents</p>
        </div>
        <button style={styles.createBtn} onClick={openCreate}>
          + Nouveau contenu
        </button>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total', value: stats.total, color: '#6366f1' },
          { label: 'Publiés', value: stats.published, color: '#10b981' },
          { label: 'Brouillons', value: stats.drafts, color: '#f59e0b' },
          { label: 'Vues totales', value: stats.totalViews, color: '#3b82f6' },
        ].map((s, i) => (
          <div key={i} style={styles.statCard}>
            <span style={{ ...styles.statValue, color: s.color }}>{s.value}</span>
            <span style={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Category Tabs */}
      <div style={styles.tabs}>
        {[{ value: 'all', label: 'Tout', emoji: '📚' }, ...CATEGORIES].map((cat) => (
          <button
            key={cat.value}
            style={{
              ...styles.tab,
              ...(activeTab === cat.value ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(cat.value as any)}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Filters bar */}
      <div style={styles.filtersBar}>
        <input
          style={styles.searchInput}
          placeholder="🔍 Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select style={styles.select} value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
          <option value="all">Tous types</option>
          <option value="article">Articles</option>
          <option value="video">Vidéos</option>
          <option value="conseil">Conseils</option>
        </select>
        <select style={styles.select} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
          <option value="all">Tous statuts</option>
          <option value="published">Publiés</option>
          <option value="draft">Brouillons</option>
        </select>
      </div>

      {/* Content list */}
      <div style={styles.contentList}>
        {filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>📭</p>
            <p style={styles.emptyText}>Aucun contenu trouvé</p>
            <button style={styles.createBtn} onClick={openCreate}>Créer le premier contenu</button>
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} style={{ ...styles.contentCard, ...(item.pinned ? styles.contentCardPinned : {}) }}>
              <div style={styles.contentCardLeft}>
                <div style={styles.contentCardMeta}>
                  {item.pinned && <span style={styles.pinnedBadge}>📌 Épinglé</span>}
                  <span style={{ ...styles.typeBadge, backgroundColor: TYPE_LABELS[item.type].color + '22', color: TYPE_LABELS[item.type].color }}>
                    {TYPE_LABELS[item.type].label}
                  </span>
                  <span style={styles.categoryBadge}>
                    {CATEGORIES.find((c) => c.value === item.category)?.emoji} {CATEGORIES.find((c) => c.value === item.category)?.label}
                  </span>
                  <span style={styles.metaText}>{item.read_time_minutes} min</span>
                  <span style={styles.metaText}>👁 {item.views}</span>
                </div>
                <h3 style={styles.contentCardTitle}>{item.title}</h3>
                <p style={styles.contentCardExcerpt}>{item.excerpt}</p>
                <div style={styles.contentCardFooter}>
                  <span style={styles.metaText}>
                    {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span style={styles.targetBadge}>
                    {item.target_roles.includes('both') ? '👥 Tous' : item.target_roles.includes('coach') ? '⚡ Coach' : '🏡 Parent'}
                  </span>
                </div>
              </div>
              <div style={styles.contentCardActions}>
                <div style={styles.publishToggle}>
                  <span style={{ ...styles.statusDot, backgroundColor: item.published ? '#10b981' : '#f59e0b' }} />
                  <span style={{ ...styles.statusText, color: item.published ? '#10b981' : '#f59e0b' }}>
                    {item.published ? 'Publié' : 'Brouillon'}
                  </span>
                </div>
                <button style={styles.actionBtn} onClick={() => togglePublish(item.id)} title={item.published ? 'Dépublier' : 'Publier'}>
                  {item.published ? '⬇️' : '🚀'}
                </button>
                <button style={styles.actionBtn} onClick={() => togglePin(item.id)} title={item.pinned ? 'Désépingler' : 'Épingler'}>
                  📌
                </button>
                <button style={styles.actionBtn} onClick={() => openEdit(item)} title="Modifier">
                  ✏️
                </button>
                <button style={{ ...styles.actionBtn, ...styles.deleteBtn }} onClick={() => handleDelete(item.id)} title="Supprimer">
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editItem ? 'Modifier le contenu' : 'Nouveau contenu'}</h2>
              <button style={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Type</label>
                  <select style={styles.formSelect} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContentType })}>
                    <option value="article">📰 Article</option>
                    <option value="video">🎥 Vidéo</option>
                    <option value="conseil">💡 Conseil</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Catégorie</label>
                  <select style={styles.formSelect} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ContentCategory })}>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Audience</label>
                  <select style={styles.formSelect} value={form.target_roles[0]} onChange={(e) => setForm({ ...form, target_roles: [e.target.value as TargetRole] })}>
                    <option value="both">👥 Tous</option>
                    <option value="coach">⚡ Coach</option>
                    <option value="parent">🏡 Parent</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Titre *</label>
                <input
                  style={styles.formInput}
                  placeholder="Titre du contenu..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Résumé</label>
                <textarea
                  style={{ ...styles.formInput, ...styles.formTextarea }}
                  placeholder="Courte description affichée dans la liste..."
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  rows={2}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Contenu</label>
                <textarea
                  style={{ ...styles.formInput, ...styles.formTextareaLarge }}
                  placeholder="Rédigez le contenu complet ici..."
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={8}
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Temps de lecture (min)</label>
                  <input
                    style={styles.formInput}
                    type="number"
                    min={1}
                    max={60}
                    value={form.read_time_minutes}
                    onChange={(e) => setForm({ ...form, read_time_minutes: parseInt(e.target.value) || 3 })}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Options</label>
                  <div style={styles.checkboxRow}>
                    <label style={styles.checkboxLabel}>
                      <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
                      Publier immédiatement
                    </label>
                    <label style={styles.checkboxLabel}>
                      <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
                      Épingler en tête
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>Annuler</button>
              <button
                style={{ ...styles.saveBtn, ...(form.title.trim() ? {} : styles.saveBtnDisabled) }}
                onClick={handleSave}
                disabled={!form.title.trim()}
              >
                {editItem ? '✓ Enregistrer' : '+ Publier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '32px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  pageTitle: { fontSize: '24px', fontWeight: 700, color: '#f8fafc', margin: 0 },
  pageSubtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0' },
  createBtn: { backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  statCard: { backgroundColor: '#1e293b', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px' },
  statValue: { fontSize: '28px', fontWeight: 700 },
  statLabel: { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' },
  tab: { padding: '8px 16px', borderRadius: '20px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', transition: 'all 150ms' },
  tabActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: '#6366f1', color: '#a5b4fc' },
  filtersBar: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  searchInput: { flex: 1, minWidth: '200px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px', color: '#f8fafc', fontSize: '14px', outline: 'none' },
  select: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px', color: '#94a3b8', fontSize: '14px', outline: 'none', cursor: 'pointer' },
  contentList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  emptyState: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#1e293b', borderRadius: '16px' },
  emptyIcon: { fontSize: '48px', margin: '0 0 12px' },
  emptyText: { color: '#64748b', fontSize: '16px', marginBottom: '20px' },
  contentCard: { backgroundColor: '#1e293b', borderRadius: '14px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', border: '1px solid #334155', transition: 'border-color 150ms' },
  contentCardPinned: { borderColor: '#6366f1', backgroundColor: '#1a1d35' },
  contentCardLeft: { flex: 1, minWidth: 0 },
  contentCardMeta: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' },
  pinnedBadge: { fontSize: '11px', color: '#a5b4fc', backgroundColor: 'rgba(99,102,241,0.15)', padding: '2px 8px', borderRadius: '10px' },
  typeBadge: { fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 },
  categoryBadge: { fontSize: '11px', color: '#94a3b8', backgroundColor: '#0f172a', padding: '2px 8px', borderRadius: '10px' },
  metaText: { fontSize: '12px', color: '#475569' },
  contentCardTitle: { fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: '0 0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  contentCardExcerpt: { fontSize: '14px', color: '#64748b', margin: '0 0 10px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  contentCardFooter: { display: 'flex', gap: '12px', alignItems: 'center' },
  targetBadge: { fontSize: '11px', color: '#475569', backgroundColor: '#0f172a', padding: '2px 8px', borderRadius: '10px' },
  contentCardActions: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 },
  publishToggle: { display: 'flex', alignItems: 'center', gap: '6px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  statusText: { fontSize: '12px', fontWeight: 600 },
  actionBtn: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '6px 10px', fontSize: '14px', cursor: 'pointer', transition: 'background 150ms' },
  deleteBtn: { borderColor: '#7f1d1d22' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { backgroundColor: '#1e293b', borderRadius: '20px', width: '100%', maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid #334155' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #334155' },
  modalTitle: { fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: 0 },
  modalClose: { background: 'none', border: 'none', color: '#64748b', fontSize: '18px', cursor: 'pointer', padding: '4px' },
  modalBody: { padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #334155' },
  formRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' },
  formInput: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px', color: '#f8fafc', fontSize: '14px', outline: 'none', fontFamily: 'inherit' },
  formSelect: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px', color: '#f8fafc', fontSize: '14px', outline: 'none', cursor: 'pointer' },
  formTextarea: { resize: 'vertical', minHeight: '70px' },
  formTextareaLarge: { resize: 'vertical', minHeight: '180px' },
  checkboxRow: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' },
  cancelBtn: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '10px 20px', color: '#94a3b8', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  saveBtn: { backgroundColor: '#6366f1', border: 'none', borderRadius: '10px', padding: '10px 24px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' },
  saveBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
};
