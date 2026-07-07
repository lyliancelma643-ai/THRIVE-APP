'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabaseClient as supabase } from '@thrive/shared';
import {
  Task, TaskComment, TaskAttachment, TaskHistoryEntry, AdminProfile,
  Status, Priority, Category, STATUSES, PRIORITIES, CATEGORIES,
  fullName, fmtDate, fmtDateTime, describeHistory, detectLinkLabel, isOverdue,
} from '@/lib/roadmap';

// ─────────────────────────────────────────────────────────────────────────────
// Fiche de tâche complète (modale) :
//   · édition structurelle (Super Admin) — titre, description, groupe,
//     priorité, échéance, attribution ;
//   · statut (personne en charge ou Super Admin) : à faire / en cours /
//     en révision / bloquée / terminée ;
//   · section « Problème » : signalée par l'assigné, résolue par le Super Admin ;
//   · écriture libre : commentaires signés + mentions, liens Google Docs… ;
//   · pièces jointes : lien (Drive/Dropbox/…) ou upload direct (Storage) ;
//   · historique : qui a modifié quoi, quand — et signatures (créée/complétée).
// createPortal(document.body) : le layout admin peut porter un transform.
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  task: Task;
  admins: AdminProfile[];
  me: string;
  isSuperAdmin: boolean;
  dark: boolean;
  onPatch: (id: string, fields: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
};

const inputCls =
  'w-full text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] ' +
  'text-slate-800 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300';

const chipBtn =
  'text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 ' +
  'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors';

export function TaskDetail({ task, admins, me, isSuperAdmin, dark, onPatch, onDelete, onClose }: Props) {
  const adminById = Object.fromEntries(admins.map((a) => [a.id, a]));
  const isAssignee = task.assignee === me;
  const canStatus = isSuperAdmin || isAssignee;
  const canReportProblem = isSuperAdmin || isAssignee || task.created_by === me;

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [commentBody, setCommentBody] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [problemDraft, setProblemDraft] = useState('');
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [c, a, h] = await Promise.all([
      supabase.from('admin_task_comments').select('*').eq('task_id', task.id).order('created_at'),
      supabase.from('admin_task_attachments').select('*').eq('task_id', task.id).order('created_at'),
      supabase.from('admin_task_history').select('*').eq('task_id', task.id)
        .order('created_at', { ascending: false }).limit(50),
    ]);
    setComments((c.data ?? []) as TaskComment[]);
    setAttachments((a.data ?? []) as TaskAttachment[]);
    setHistory((h.data ?? []) as TaskHistoryEntry[]);
  }, [task.id]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`task-detail-${task.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_task_comments', filter: `task_id=eq.${task.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_task_attachments', filter: `task_id=eq.${task.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [task.id, load]);

  // Échap pour fermer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue');
    }
    setBusy(false);
  };

  const addComment = () =>
    act(async () => {
      if (!commentBody.trim()) return;
      const { error: err } = await supabase.from('admin_task_comments').insert({
        task_id: task.id, author: me, body: commentBody.trim(), mentions,
      });
      if (err) throw new Error(err.message);
      setCommentBody('');
      setMentions([]);
      await load();
    });

  const addLink = () =>
    act(async () => {
      if (!linkUrl.trim()) return;
      const { error: err } = await supabase.from('admin_task_attachments').insert({
        task_id: task.id, kind: 'LINK', url: linkUrl.trim(),
        label: detectLinkLabel(linkUrl.trim()), created_by: me,
      });
      if (err) throw new Error(err.message);
      setLinkUrl('');
      await load();
    });

  const uploadFile = (file: File) =>
    act(async () => {
      const path = `${task.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('admin-attachments').upload(path, file);
      if (upErr) throw new Error(upErr.message);
      const { error: err } = await supabase.from('admin_task_attachments').insert({
        task_id: task.id, kind: 'FILE', url: path, label: file.name, created_by: me,
      });
      if (err) throw new Error(err.message);
      await load();
    });

  const openAttachment = async (a: TaskAttachment) => {
    if (a.kind === 'LINK') {
      window.open(a.url, '_blank', 'noopener');
      return;
    }
    const { data } = await supabase.storage.from('admin-attachments').createSignedUrl(a.url, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
  };

  const removeAttachment = (a: TaskAttachment) =>
    act(async () => {
      const { error: err } = await supabase.from('admin_task_attachments').delete().eq('id', a.id);
      if (err) throw new Error(err.message);
      if (a.kind === 'FILE') await supabase.storage.from('admin-attachments').remove([a.url]);
      await load();
    });

  const patch = (fields: Partial<Task>) =>
    act(async () => {
      await onPatch(task.id, fields);
      await load();
    });

  const toggleMention = (id: string, name: string) => {
    if (mentions.includes(id)) {
      setMentions(mentions.filter((m) => m !== id));
      setCommentBody(commentBody.replace(`@${name} `, '').replace(`@${name}`, ''));
    } else {
      setMentions([...mentions, id]);
      setCommentBody((b) => (b.endsWith(' ') || b === '' ? b : b + ' ') + `@${name} `);
    }
  };

  return createPortal(
    <div className={dark ? 'dark' : ''}>
    <div
      className="fixed inset-0 z-[90] flex items-start md:items-center justify-center p-3 md:p-6 bg-navy-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Tâche : ${task.title}`}
    >
      <div
        className="w-full max-w-2xl my-4 rounded-2xl bg-white dark:bg-[#0d1b2a] border border-slate-100 dark:border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── En-tête ── */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-start justify-between gap-3">
            {isSuperAdmin ? (
              <input
                defaultValue={task.title}
                aria-label="Titre"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== task.title) patch({ title: v });
                }}
                className="flex-1 text-lg font-bold rounded-lg bg-transparent text-navy-900 dark:text-white border border-transparent hover:border-slate-200 dark:hover:border-white/10 focus:border-navy-300 px-2 py-1 -mx-2 focus:outline-none"
              />
            ) : (
              <h2 className="flex-1 text-lg font-bold text-navy-900 dark:text-white">{task.title}</h2>
            )}
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 text-lg"
            >
              ✕
            </button>
          </div>

          {/* Statut : personnalisable par la personne en charge ou le Super Admin */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(Object.keys(STATUSES) as Status[]).map((s) => (
              <button
                key={s}
                disabled={!canStatus || busy}
                onClick={() => patch({ status: s })}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all disabled:cursor-not-allowed ${
                  task.status === s
                    ? STATUSES[s].chip + ' ring-2 ring-navy-300 dark:ring-sun/50'
                    : 'bg-slate-50 text-slate-400 dark:bg-white/5 dark:text-slate-500 ' +
                      (canStatus ? 'hover:bg-slate-100 dark:hover:bg-white/10' : 'opacity-60')
                }`}
              >
                {STATUSES[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[65vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-sm px-3 py-2">
              {error}
            </div>
          )}

          {/* ── Problème (rouge) : au Super Admin de le régler ── */}
          {task.problem ? (
            <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-red-700 dark:text-red-300">⚠ Problème signalé</p>
                {isSuperAdmin && (
                  <button
                    onClick={() => patch({ problem: null })}
                    disabled={busy}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
                  >
                    Marquer comme résolu
                  </button>
                )}
              </div>
              <p className="text-sm text-red-800 dark:text-red-200 mt-2 whitespace-pre-wrap">{task.problem}</p>
              <p className="text-[11px] text-red-500/80 mt-2">
                Signalé par {fullName(adminById[task.problem_by ?? ''])}
                {task.problem_at ? ` · ${fmtDateTime(task.problem_at)}` : ''} — à régler par le Super Admin.
              </p>
            </div>
          ) : showProblemForm ? (
            <div className="rounded-xl border border-red-200 dark:border-red-500/30 p-4 space-y-2">
              <textarea
                value={problemDraft}
                onChange={(e) => setProblemDraft(e.target.value)}
                rows={2}
                placeholder="Décris le blocage — le Super Admin sera notifié immédiatement."
                className={inputCls}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => problemDraft.trim() && patch({ problem: problemDraft.trim() }).then(() => setShowProblemForm(false))}
                  disabled={busy || !problemDraft.trim()}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
                >
                  Signaler le problème
                </button>
                <button onClick={() => setShowProblemForm(false)} className={chipBtn}>Annuler</button>
              </div>
            </div>
          ) : (
            canReportProblem && (
              <button onClick={() => setShowProblemForm(true)} className={chipBtn}>
                ⚠ Signaler un problème
              </button>
            )
          )}

          {/* ── Propriétés ── */}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">
              Groupe
              <select
                value={task.category}
                disabled={!isSuperAdmin || busy}
                onChange={(e) => patch({ category: e.target.value as Category })}
                className={inputCls + ' mt-1 disabled:opacity-60'}
              >
                {(Object.keys(CATEGORIES) as Category[]).map((c) => (
                  <option key={c} value={c}>{CATEGORIES[c].label}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Priorité
              <select
                value={task.priority}
                disabled={!isSuperAdmin || busy}
                onChange={(e) => patch({ priority: e.target.value as Priority })}
                className={inputCls + ' mt-1 disabled:opacity-60'}
              >
                {(Object.keys(PRIORITIES) as Priority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITIES[p].label}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Échéance {isOverdue(task) && <span className="text-red-500 font-bold">· en retard</span>}
              <input
                type="date"
                value={task.deadline ?? ''}
                disabled={!isSuperAdmin || busy}
                onChange={(e) => patch({ deadline: e.target.value || null })}
                className={inputCls + ' mt-1 disabled:opacity-60'}
              />
              <span className="block mt-1 text-[10px] text-slate-400">
                Classement automatique : semaine / mois / 3 mois / année selon la date.
              </span>
            </label>
            <label className="text-xs text-slate-400">
              Attribuée à
              {isSuperAdmin ? (
                <select
                  value={task.assignee ?? ''}
                  disabled={busy}
                  onChange={(e) => patch({ assignee: e.target.value || null })}
                  className={inputCls + ' mt-1'}
                >
                  <option value="">Non assignée</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {fullName(a)}{a.role === 'SUPER_ADMIN' ? ' ★' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <span className={inputCls + ' flex-1'}>
                    {task.assignee ? fullName(adminById[task.assignee]) + (isAssignee ? ' (moi)' : '') : 'Non assignée'}
                  </span>
                  {!task.assignee && (
                    <button
                      onClick={() => patch({ assignee: me, status: 'IN_PROGRESS' })}
                      disabled={busy}
                      className="shrink-0 text-xs font-bold px-3 py-2 rounded-lg bg-sun text-navy-900 hover:bg-sun-dark"
                    >
                      Je m&apos;en occupe
                    </button>
                  )}
                  {isAssignee && (
                    <button onClick={() => patch({ assignee: null, status: 'TODO' })} disabled={busy} className={chipBtn}>
                      Libérer
                    </button>
                  )}
                </div>
              )}
            </label>
          </div>

          {/* ── Description ── */}
          <label className="block text-xs text-slate-400">
            Description
            {isSuperAdmin ? (
              <textarea
                defaultValue={task.description ?? ''}
                rows={3}
                placeholder="Contexte, critères de done, liens de référence…"
                onBlur={(e) => {
                  const v = e.target.value.trim() || null;
                  if (v !== task.description) patch({ description: v });
                }}
                className={inputCls + ' mt-1'}
              />
            ) : (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {task.description || '—'}
              </p>
            )}
          </label>

          {/* ── Pièces jointes ── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
              Pièces jointes · Google Drive, Dropbox, upload…
            </p>
            <ul className="space-y-1.5 mb-2">
              {attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => openAttachment(a)}
                    className="flex-1 min-w-0 text-left truncate rounded-lg px-3 py-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-navy-700 dark:text-sky-300"
                  >
                    {a.kind === 'FILE' ? '📄' : '🔗'} {a.label}
                    <span className="text-[10px] text-slate-400 ml-2">
                      par {fullName(adminById[a.created_by])} · {fmtDate(a.created_at)}
                    </span>
                  </button>
                  {(isSuperAdmin || a.created_by === me) && (
                    <button
                      onClick={() => removeAttachment(a)}
                      aria-label={`Supprimer ${a.label}`}
                      className="shrink-0 text-slate-300 hover:text-red-500 px-1"
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLink()}
                placeholder="Coller un lien (Docs, Drive, Dropbox…)"
                className={inputCls + ' flex-1'}
              />
              <button onClick={addLink} disabled={busy || !linkUrl.trim()} className={chipBtn}>+ Lien</button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile(f);
                  e.target.value = '';
                }}
              />
              <button onClick={() => fileRef.current?.click()} disabled={busy} className={chipBtn}>
                ⤒ Fichier
              </button>
            </div>
          </div>

          {/* ── Écriture libre : fil de commentaires signés + mentions ── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
              Discussion · notes libres, liens, décisions
            </p>
            <ul className="space-y-3 mb-3">
              {comments.map((c) => (
                <li key={c.id} className="rounded-xl bg-slate-50 dark:bg-white/5 px-3 py-2.5">
                  <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
                    {c.body.split(/(https?:\/\/\S+)/g).map((part, i) =>
                      /^https?:\/\//.test(part) ? (
                        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
                           className="text-navy-600 dark:text-sky-300 underline break-all">
                          {part}
                        </a>
                      ) : (
                        <span key={i}>{part}</span>
                      ),
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    ✍︎ {fullName(adminById[c.author])} · {fmtDateTime(c.created_at)}
                  </p>
                </li>
              ))}
              {comments.length === 0 && (
                <li className="text-sm text-slate-400">Aucune note pour l&apos;instant.</li>
              )}
            </ul>
            <div className="space-y-2">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={2}
                placeholder="Écris librement : avancement, lien Google Docs, décision…"
                className={inputCls}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 mr-1">Mentionner :</span>
                {admins.filter((a) => a.id !== me).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => toggleMention(a.id, fullName(a))}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                      mentions.includes(a.id)
                        ? 'bg-navy-600 text-white'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    @{fullName(a)}
                  </button>
                ))}
                <button
                  onClick={addComment}
                  disabled={busy || !commentBody.trim()}
                  className="ml-auto text-xs font-bold px-4 py-2 rounded-lg bg-navy-600 text-white hover:bg-navy-700 disabled:opacity-40"
                >
                  Publier
                </button>
              </div>
            </div>
          </div>

          {/* ── Historique ── */}
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs font-bold uppercase tracking-wide text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Historique ({history.length}) {showHistory ? '▾' : '▸'}
            </button>
            {showHistory && (
              <ul className="mt-2 space-y-1.5 border-l-2 border-slate-100 dark:border-white/10 pl-3">
                {history.map((h) => (
                  <li key={h.id} className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {fullName(adminById[h.actor ?? ''])}
                    </span>{' '}
                    {describeHistory(h, adminById)}
                    <span className="text-slate-300 dark:text-slate-500"> · {fmtDateTime(h.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Pied : signatures + suppression ── */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="text-[11px] text-slate-400">
            Créée par <span className="font-semibold">{fullName(adminById[task.created_by])}</span> · {fmtDate(task.created_at)}
          </p>
          {task.completed_by && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
              ✓ Complétée par <span className="font-semibold">{fullName(adminById[task.completed_by])}</span>
              {task.completed_at ? ` · ${fmtDateTime(task.completed_at)}` : ''}
            </p>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => onDelete(task.id).then(onClose)}
              disabled={busy}
              className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              Supprimer la tâche
            </button>
          )}
        </div>
      </div>
    </div>
    </div>,
    document.body,
  );
}
