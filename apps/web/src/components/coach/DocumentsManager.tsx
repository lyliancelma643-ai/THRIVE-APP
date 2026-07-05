'use client';

// Documents PDF du dossier (contrat de confiance, lettre à moi-même, certificat).
// Upload → Supabase Storage privé + métadonnées ; aperçu/téléchargement via URL
// signée ; bascule de visibilité parent.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import {
  DocKind,
  DocMeta,
  deleteDocument,
  fetchDocuments,
  fmtBytes,
  signedDocUrl,
  uploadDocument,
} from '@/lib/bilan';
import { Btn } from './ui';

const KINDS: { value: DocKind; label: string; hint: string }[] = [
  { value: 'CONTRACT', label: 'Contrat de confiance', hint: 'Signé en séance 1' },
  { value: 'LETTER', label: 'Lettre à moi-même', hint: 'Écrite en séance 13' },
  { value: 'CERTIFICATE', label: 'Certificat THRIVE', hint: 'Remis en fin de parcours' },
  { value: 'OTHER', label: 'Autre document', hint: '' },
];

export function DocumentsManager({ childId }: { childId: string }) {
  const { user } = useAuthStore();
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<DocKind | null>(null);
  const [error, setError] = useState('');
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setDocs(await fetchDocuments(childId));
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onPick = async (kind: DocKind, file: File | undefined) => {
    if (!file) return;
    if (file.type && file.type !== 'application/pdf') {
      setError('Merci de sélectionner un fichier PDF.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 20 Mo).');
      return;
    }
    setBusy(kind);
    setError('');
    const res = await uploadDocument({
      childId,
      kind,
      file,
      title: KINDS.find((k) => k.value === kind)?.label,
      parentVisible: kind === 'CONTRACT' ? false : true,
      uploadedBy: user?.id,
    });
    setBusy(null);
    if (res.error) setError(res.error);
    else await load();
  };

  const open = async (doc: DocMeta) => {
    const url = await signedDocUrl(doc.storage_path, 120);
    if (url) window.open(url, '_blank', 'noopener');
    else setError('Impossible de générer le lien de téléchargement.');
  };

  const toggleVisible = async (doc: DocMeta) => {
    setDocs((xs) => xs.map((d) => (d.id === doc.id ? { ...d, parent_visible: !d.parent_visible } : d)));
    await supabase
      .from('athlete_documents')
      .update({ parent_visible: !doc.parent_visible })
      .eq('id', doc.id);
  };

  const remove = async (doc: DocMeta) => {
    setDocs((xs) => xs.filter((d) => d.id !== doc.id));
    const res = await deleteDocument(doc);
    if (res.error) {
      setError(res.error);
      await load();
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="p-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {KINDS.map((k) => {
          const existing = docs.filter((d) => d.kind === k.value);
          return (
            <div key={k.value} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-semibold text-navy-900">{k.label}</p>
                  {k.hint && <p className="text-[11px] text-gray-400">{k.hint}</p>}
                </div>
                <input
                  ref={(el) => {
                    inputs.current[k.value] = el;
                  }}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => onPick(k.value, e.target.files?.[0])}
                />
                <Btn
                  variant="ghost"
                  disabled={busy === k.value}
                  onClick={() => inputs.current[k.value]?.click()}
                >
                  {busy === k.value ? 'Envoi…' : '＋ PDF'}
                </Btn>
              </div>

              {loading ? (
                <div className="h-9 rounded-lg bg-gray-100 animate-pulse" />
              ) : existing.length === 0 ? (
                <p className="text-xs text-gray-400">Aucun fichier.</p>
              ) : (
                <ul className="space-y-1.5">
                  {existing.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 text-sm">
                      <button
                        onClick={() => open(d)}
                        className="flex-1 text-left truncate text-navy-700 hover:underline cursor-pointer"
                        title={d.file_name ?? ''}
                      >
                        📄 {d.file_name ?? 'document.pdf'}{' '}
                        <span className="text-gray-300">{fmtBytes(d.size_bytes)}</span>
                      </button>
                      <button
                        onClick={() => toggleVisible(d)}
                        className={`text-[10px] px-2 py-1 rounded-full cursor-pointer ${
                          d.parent_visible
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                        title="Visibilité côté parent"
                      >
                        {d.parent_visible ? 'Parent ✓' : 'Privé'}
                      </button>
                      <button
                        onClick={() => remove(d)}
                        className="text-gray-300 hover:text-red-600 cursor-pointer"
                        aria-label="Supprimer"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400">
        Le contrat de confiance est privé par défaut (données signées). La lettre et le certificat
        sont proposés au téléchargement du parent une fois complétés.
      </p>
    </div>
  );
}
