'use client';

// Modale « Personnaliser le passeport » (parent) : photo de profil, surnom,
// numéro de maillot, couleur d'accent. Rendue via createPortal(document.body)
// — le layout parent porte un transform persistant (animate-page-in) qui
// ferait dériver tout position:fixed rendu à l'intérieur.
// Réutilise les classes .b-modal-ov / .b-modal du DESIGN_CSS injecté par la page.

import { useEffect, useRef, useState } from 'react';
import type { ChildProfile } from '@/lib/catalog';
import {
  ACCENT_PRESETS,
  accentHex,
  deleteChildAvatarFile,
  saveChildPassport,
  uploadChildAvatar,
} from '@/lib/avatar';

const FIELD_LABEL: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: '.05em',
  textTransform: 'uppercase',
  color: 'rgba(234,243,241,.5)',
  display: 'block',
  marginBottom: 7,
};

const INPUT: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 48,
  padding: '0 14px',
  borderRadius: 13,
  background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(255,255,255,.12)',
  color: '#eaf3f1',
  fontSize: 15,
  outline: 'none',
};

export function PassportEditModal({
  child,
  currentAvatarUrl,
  onClose,
  onSaved,
}: {
  child: ChildProfile;
  currentAvatarUrl: string | null; // URL signée déjà résolue (aperçu)
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nickname, setNickname] = useState(child.nickname ?? '');
  const [jersey, setJersey] = useState(child.jersey_number?.toString() ?? '');
  const [accent, setAccent] = useState(child.accent_color ?? 'sun');
  const [file, setFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Aperçu local de la photo choisie (révoqué au démontage / changement).
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shownAvatar = removePhoto ? null : preview ?? currentAvatarUrl;
  const hex = accentHex(accent);
  const initials =
    `${child.first_name?.[0] ?? ''}${child.last_name?.[0] ?? ''}`.toUpperCase() || '★';

  const save = async () => {
    setSaving(true);
    setError('');

    const patch: Parameters<typeof saveChildPassport>[1] = {
      nickname: nickname.trim() ? nickname.trim().slice(0, 30) : null,
      jersey_number: jersey.trim() ? Math.max(0, Math.min(999, parseInt(jersey, 10) || 0)) : null,
      accent_color: accent,
    };

    const oldPath = child.avatar_url;
    if (file && !removePhoto) {
      const up = await uploadChildAvatar(child.id, file);
      if (up.error || !up.path) {
        setSaving(false);
        setError(`Photo non enregistrée : ${up.error ?? 'erreur inconnue'}`);
        return;
      }
      patch.avatar_url = up.path;
    } else if (removePhoto) {
      patch.avatar_url = null;
    }

    const res = await saveChildPassport(child.id, patch);
    if (res.error) {
      // La photo vient d'être téléversée mais la fiche n'a pas suivi : on
      // retire le fichier orphelin avant de sortir en erreur.
      if (patch.avatar_url) await deleteChildAvatarFile(patch.avatar_url);
      setSaving(false);
      setError(res.error);
      return;
    }
    if (patch.avatar_url !== undefined && patch.avatar_url !== oldPath) {
      await deleteChildAvatarFile(oldPath);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="b-modal-ov" role="dialog" aria-modal="true" aria-label="Personnaliser le passeport" onClick={onClose}>
      <div className="b-modal" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute', top: 12, right: 12, width: 44, height: 44,
            borderRadius: 14, background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.12)', color: 'rgba(234,243,241,.75)',
            fontSize: 16, cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}
        >
          ✕
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 20, paddingRight: 56 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 12, background: `${hex}1a`,
            border: `1px solid ${hex}40`, display: 'grid', placeItems: 'center', fontSize: 17,
          }}>
            ✎
          </span>
          <h2 className="disp" style={{ margin: 0, fontWeight: 600, fontSize: 21 }}>
            Personnaliser le passeport
          </h2>
        </div>

        {/* Photo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
          <span style={{ position: 'relative', flexShrink: 0 }}>
            {shownAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownAvatar} alt="" style={{
                width: 76, height: 76, borderRadius: 20, objectFit: 'cover',
                boxShadow: `0 0 0 2.5px ${hex}66`,
              }} />
            ) : (
              <span className="disp" style={{
                width: 76, height: 76, borderRadius: 20,
                background: 'linear-gradient(150deg,#0E6593,#00314C)',
                boxShadow: `0 0 0 2.5px ${hex}66`, display: 'grid', placeItems: 'center',
                fontWeight: 700, fontSize: 25, color: '#fff',
              }}>
                {initials}
              </span>
            )}
            {jersey.trim() !== '' && (
              <span style={{
                position: 'absolute', right: -8, bottom: -8, minWidth: 26, height: 26,
                padding: '0 6px', borderRadius: 9, background: hex, color: '#06222a',
                fontWeight: 800, fontSize: 12, display: 'grid', placeItems: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,.45)',
              }}>
                {Math.max(0, Math.min(999, parseInt(jersey, 10) || 0))}
              </span>
            )}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                minHeight: 44, padding: '0 16px', borderRadius: 12, border: 'none',
                background: 'rgba(255,255,255,.08)', color: '#eaf3f1',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              📷 {shownAvatar ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            {shownAvatar && (
              <button
                onClick={() => { setFile(null); setRemovePhoto(true); }}
                style={{
                  minHeight: 36, padding: '0 16px', borderRadius: 12, border: 'none',
                  background: 'transparent', color: 'rgba(234,243,241,.55)',
                  fontWeight: 500, fontSize: 12, cursor: 'pointer', textAlign: 'left',
                }}
              >
                Retirer la photo
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f) { setFile(f); setRemovePhoto(false); }
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {/* Surnom + numéro */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 108px', gap: 12, marginBottom: 18 }}>
          <div>
            <label htmlFor="pp-nick" style={FIELD_LABEL}>Surnom d’athlète</label>
            <input
              id="pp-nick" style={INPUT} value={nickname} maxLength={30}
              placeholder="ex. La Fusée" onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="pp-num" style={FIELD_LABEL}>N° maillot</label>
            <input
              id="pp-num" style={INPUT} value={jersey} inputMode="numeric" maxLength={3}
              placeholder="—" onChange={(e) => setJersey(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        {/* Couleur du passeport */}
        <div style={{ marginBottom: 24 }}>
          <span style={FIELD_LABEL}>Couleur du passeport</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setAccent(p.key)}
                aria-label={p.label}
                aria-pressed={accent === p.key}
                style={{
                  width: 44, height: 44, borderRadius: 14, cursor: 'pointer',
                  background: p.hex,
                  border: accent === p.key ? '3px solid #fff' : '3px solid transparent',
                  boxShadow: accent === p.key ? `0 0 0 2px ${p.hex}` : 'none',
                  transition: 'box-shadow .15s ease, border-color .15s ease',
                }}
              />
            ))}
          </div>
        </div>

        {error && (
          <p style={{
            margin: '0 0 14px', padding: '10px 13px', borderRadius: 12,
            background: 'rgba(220,80,80,.15)', color: '#ffb4b4', fontSize: 13,
          }}>
            {error}
          </p>
        )}

        <button
          onClick={save}
          disabled={saving}
          style={{
            width: '100%', minHeight: 52, borderRadius: 15, border: 'none',
            background: saving ? 'rgba(255,255,255,.12)' : hex,
            color: saving ? 'rgba(234,243,241,.5)' : '#06222a',
            fontWeight: 700, fontSize: 15, cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(234,243,241,.4)', margin: '12px 0 0' }}>
          La photo reste privée : visible uniquement par la famille, le coach et l’équipe THRIVE.
        </p>
      </div>
    </div>
  );
}
