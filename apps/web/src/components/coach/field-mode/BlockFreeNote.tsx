'use client';

// BLOC 5 — Notes libres.
//
// Chaque champ du contenu source ouvre un éditeur plein écran : le clavier ne
// masque ni la zone de saisie ni le bouton de validation (la hauteur suit le
// `visualViewport`). Sauvegarde automatique, et dictée vocale quand la
// plateforme la propose — un coach ganté ne tape pas au clavier.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FieldModeNote } from '@/lib/field-mode/types';
import { confirm as hapticConfirm, tap } from './haptics';

type SpeechSession = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechCtor = new () => SpeechSession;

function speechCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Hauteur réellement visible — le clavier mobile réduit le `visualViewport`. */
function useViewportHeight() {
  const [h, setH] = useState<number | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setH(vv.height);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return h;
}

export function BlockFreeNote({
  notes,
  fields,
  onChange,
}: {
  notes: FieldModeNote[];
  fields: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const [editing, setEditing] = useState<FieldModeNote | null>(null);
  if (notes.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        {notes.map((note) => {
          const value = fields[note.key] ?? '';
          return (
            <button
              key={note.key}
              type="button"
              onClick={() => {
                tap();
                setEditing(note);
              }}
              className="w-full min-h-[56px] px-4 py-3 rounded-2xl text-left transition-colors duration-150"
              style={{
                background: 'var(--fm-surface)',
                border: `2px solid ${value ? 'var(--fm-ok)' : 'var(--fm-border)'}`,
              }}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden style={{ color: value ? 'var(--fm-ok)' : 'var(--fm-dim)' }}>
                  {value ? '✓' : '＋'}
                </span>
                <span className="text-[17px] font-bold" style={{ color: 'var(--fm-text)' }}>
                  {value ? note.label : `Ajouter une précision — ${note.label}`}
                </span>
              </span>
              {value && (
                <span
                  className="mt-1 block text-[15px] line-clamp-2"
                  style={{ color: 'var(--fm-dim)' }}
                >
                  {value}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {editing && (
        <NoteEditor
          note={editing}
          value={fields[editing.key] ?? ''}
          onChange={(v) => onChange(editing.key, v)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function NoteEditor({
  note,
  value,
  onChange,
  onClose,
}: {
  note: FieldModeNote;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(true);
  const [listening, setListening] = useState(false);
  const [mounted, setMounted] = useState(false);
  const height = useViewportHeight();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SpeechSession | null>(null);
  const Ctor = speechCtor();

  useEffect(() => {
    setMounted(true);
    areaRef.current?.focus();
  }, []);

  // Sauvegarde automatique — le brouillon de séance encaisse ensuite son
  // propre debounce vers le stockage local.
  useEffect(() => {
    if (draft === value) return;
    setSaved(false);
    const id = setTimeout(() => {
      onChange(draft);
      setSaved(true);
    }, 400);
    return () => clearTimeout(id);
  }, [draft, value, onChange]);

  useEffect(() => () => recRef.current?.stop(), []);

  const toggleDictation = () => {
    if (!Ctor) return;
    tap();
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = 'fr-CA';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setDraft((d) => (d ? `${d} ${text}`.trim() : text.trim()));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  if (!mounted) return null;

  // Portée sur <body> : imbriqué, l'éditeur héritait d'un décalage de son
  // conteneur et laissait apparaître la barre de la coquille.
  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex flex-col"
      style={{ background: 'var(--fm-bg)', height: height ? `${height}px` : '100dvh' }}
      role="dialog"
      aria-modal="true"
      aria-label={note.label}
    >
      <div className="shrink-0 px-4 pt-4 pb-2">
        <p className="text-[20px] font-bold leading-snug" style={{ color: 'var(--fm-text)' }}>
          {note.label}
        </p>
        {note.hint && (
          <p className="text-[15px] mt-0.5" style={{ color: 'var(--fm-dim)' }}>
            {note.hint}
          </p>
        )}
      </div>

      <textarea
        ref={areaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Noter ici…"
        className="flex-1 min-h-0 mx-4 p-4 rounded-2xl text-[19px] leading-relaxed resize-none"
        style={{
          background: 'var(--fm-surface)',
          color: 'var(--fm-text)',
          border: '1px solid var(--fm-border)',
        }}
      />

      {/* Zone du pouce — validation et dictée toujours visibles au-dessus du clavier. */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-3">
        <span className="text-[15px] font-semibold" aria-live="polite" style={{ color: 'var(--fm-dim)' }}>
          {saved ? 'Enregistré' : 'Enregistrement…'}
        </span>
        {Ctor && (
          <button
            type="button"
            onClick={toggleDictation}
            aria-pressed={listening}
            aria-label={listening ? 'Arrêter la dictée' : 'Dicter la note'}
            className="min-w-[56px] min-h-[56px] rounded-2xl text-[19px] font-bold"
            style={{
              background: listening ? 'var(--fm-accent)' : 'var(--fm-surface)',
              color: listening ? 'var(--fm-on-accent)' : 'var(--fm-text)',
              border: '2px solid var(--fm-border)',
            }}
          >
            {listening ? '● Stop' : '🎙'}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onChange(draft);
            hapticConfirm();
            onClose();
          }}
          className="ml-auto min-h-[56px] px-8 rounded-2xl text-[19px] font-bold"
          style={{ background: 'var(--fm-accent)', color: 'var(--fm-on-accent)' }}
        >
          Terminé
        </button>
      </div>
    </div>,
    document.body
  );
}
