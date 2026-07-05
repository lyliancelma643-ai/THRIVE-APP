'use client';

// Éditeur de la carte d'identité de l'athlète — partagé Coach + Admin.
// Édition réservée par RLS (coach assigné/programme + ADMIN/SUPER_ADMIN). Thème clair.

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';

type ToolboxItem = { tool: string; context: string };

type Identity = {
  sport: string;
  position: string;
  club: string;
  sport_story: string;
  strengths: string[];
  season_dream: string;
  smart_goal: string;
  life_skill_goal: string;
  my_actions: string[];
  toolbox: ToolboxItem[];
  focus_word: string;
  letter: string;
  notes: string;
};

const EMPTY: Identity = {
  sport: 'Hockey sur glace',
  position: '',
  club: '',
  sport_story: '',
  strengths: [],
  season_dream: '',
  smart_goal: '',
  life_skill_goal: '',
  my_actions: [],
  toolbox: [],
  focus_word: '',
  letter: '',
  notes: '',
};

export function AthleteIdentityEditor({
  childId,
  childName,
  onSaved,
}: {
  childId: string;
  childName?: string;
  onSaved?: () => void;
}) {
  const { user } = useAuthStore();
  const [form, setForm] = useState<Identity>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: e } = await supabase
      .from('athlete_identity')
      .select('*')
      .eq('child_id', childId)
      .maybeSingle();
    if (e) {
      // Échec de chargement : on bloque l'édition (un « Enregistrer » sur un
      // formulaire vide écraserait la carte d'identité existante).
      setError(e.message);
      setLoadFailed(true);
      setLoading(false);
      return;
    }
    setLoadFailed(false);
    if (data) {
      setForm({
        sport: data.sport ?? '',
        position: data.position ?? '',
        club: data.club ?? '',
        sport_story: data.sport_story ?? '',
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        season_dream: data.season_dream ?? '',
        smart_goal: data.smart_goal ?? '',
        life_skill_goal: data.life_skill_goal ?? '',
        my_actions: Array.isArray(data.my_actions) ? data.my_actions : [],
        toolbox: Array.isArray(data.toolbox) ? (data.toolbox as ToolboxItem[]) : [],
        focus_word: data.focus_word ?? '',
        letter: data.letter ?? '',
        notes: data.notes ?? '',
      });
    } else {
      setForm(EMPTY);
    }
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  function set<K extends keyof Identity>(k: K, v: Identity[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setSavedAt(null);
  }

  const save = async () => {
    setSaving(true);
    setError('');
    const orNull = (s: string) => (s.trim() === '' ? null : s.trim());
    const payload = {
      child_id: childId,
      sport: orNull(form.sport),
      position: orNull(form.position),
      club: orNull(form.club),
      sport_story: orNull(form.sport_story),
      strengths: form.strengths.map((s) => s.trim()).filter(Boolean),
      season_dream: orNull(form.season_dream),
      smart_goal: orNull(form.smart_goal),
      life_skill_goal: orNull(form.life_skill_goal),
      my_actions: form.my_actions.map((s) => s.trim()).filter(Boolean),
      toolbox: form.toolbox.filter((t) => t.tool.trim() || t.context.trim()),
      focus_word: orNull(form.focus_word),
      letter: orNull(form.letter),
      notes: orNull(form.notes),
      updated_by: user?.id ?? null,
    };
    const { error: e } = await supabase
      .from('athlete_identity')
      .upsert(payload, { onConflict: 'child_id' });
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    setSavedAt(new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }));
    onSaved?.();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-center space-y-4">
        <p className="text-sm text-red-700">
          Impossible de charger la carte d&apos;identité{error ? ` (${error})` : ''}. Pour
          éviter d&apos;écraser des données existantes, l&apos;édition est désactivée.
        </p>
        <button
          onClick={() => load()}
          className="px-6 py-3 min-h-[44px] rounded-full bg-navy-600 hover:bg-navy-700 text-white text-sm font-bold transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Identité sportive */}
      <Section title="Identité sportive">
        <div className="grid sm:grid-cols-3 gap-3">
          <TextInput label="Sport" value={form.sport} onChange={(v) => set('sport', v)} />
          <TextInput label="Poste" value={form.position} onChange={(v) => set('position', v)} />
          <TextInput label="Club / équipe" value={form.club} onChange={(v) => set('club', v)} />
        </div>
        <TextArea
          label="Histoire sportive"
          value={form.sport_story}
          onChange={(v) => set('sport_story', v)}
          placeholder="En quelques phrases, le parcours sportif du jeune…"
        />
      </Section>

      {/* Forces & rêve */}
      <Section title="Forces & rêve de saison">
        <StringList
          label="Forces (VIA)"
          items={form.strengths}
          onChange={(v) => set('strengths', v)}
          placeholder="Ex. Persévérance"
          addLabel="+ Ajouter une force"
        />
        <TextArea
          label="Rêve de saison"
          value={form.season_dream}
          onChange={(v) => set('season_dream', v)}
          placeholder="En une phrase, dans les mots du jeune…"
        />
      </Section>

      {/* Objectifs */}
      <Section title="Objectifs">
        <TextArea
          label="Objectif technique (SMART)"
          value={form.smart_goal}
          onChange={(v) => set('smart_goal', v)}
        />
        <TextArea
          label="Objectif life skill"
          value={form.life_skill_goal}
          onChange={(v) => set('life_skill_goal', v)}
        />
        <StringList
          label="Ce qui dépend uniquement de moi"
          items={form.my_actions}
          onChange={(v) => set('my_actions', v)}
          placeholder="Ex. Arriver 10 min en avance"
          addLabel="+ Ajouter une action"
        />
      </Section>

      {/* Boîte à outils */}
      <Section title="Boîte à outils THRIVE">
        <Toolbox items={form.toolbox} onChange={(v) => set('toolbox', v)} />
      </Section>

      {/* Ancrages personnels */}
      <Section title="Ancrages personnels">
        <TextInput label="Focus word" value={form.focus_word} onChange={(v) => set('focus_word', v)} />
        <TextArea
          label="Lettre à moi-même dans 1 an"
          value={form.letter}
          onChange={(v) => set('letter', v)}
        />
        <TextArea
          label="Notes (coach / admin)"
          value={form.notes}
          onChange={(v) => set('notes', v)}
          placeholder="Notes internes — non mises en avant sur la carte."
        />
      </Section>

      {error && (
        <p className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-full bg-navy-600 hover:bg-navy-700 text-white text-sm font-bold disabled:opacity-50 transition-colors cursor-pointer"
        >
          {saving ? 'Enregistrement…' : `Enregistrer la carte${childName ? ` de ${childName}` : ''}`}
        </button>
        {savedAt && <span className="text-sm text-green-600 font-medium">Enregistré à {savedAt}</span>}
      </div>
    </div>
  );
}

/* ── Sous-composants de formulaire (thème clair) ─────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 resize-y"
      />
    </label>
  );
}

function StringList({
  label,
  items,
  onChange,
  placeholder,
  addLabel,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  addLabel: string;
}) {
  return (
    <div>
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label="Supprimer"
              className="shrink-0 w-11 h-11 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="mt-2 text-sm font-medium text-navy-600 hover:text-navy-800 cursor-pointer"
      >
        {addLabel}
      </button>
    </div>
  );
}

function Toolbox({
  items,
  onChange,
}: {
  items: ToolboxItem[];
  onChange: (v: ToolboxItem[]) => void;
}) {
  return (
    <div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item.tool}
              placeholder="Outil"
              onChange={(e) =>
                onChange(items.map((x, j) => (j === i ? { ...x, tool: e.target.value } : x)))
              }
              className="w-1/3 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
            <input
              type="text"
              value={item.context}
              placeholder="Contexte hors-sport où il l'utilise"
              onChange={(e) =>
                onChange(items.map((x, j) => (j === i ? { ...x, context: e.target.value } : x)))
              }
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label="Supprimer l'outil"
              className="shrink-0 w-11 h-11 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, { tool: '', context: '' }])}
        className="mt-2 text-sm font-medium text-navy-600 hover:text-navy-800 cursor-pointer"
      >
        + Ajouter un outil
      </button>
    </div>
  );
}
