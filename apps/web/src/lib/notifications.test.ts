import { describe, expect, it } from 'vitest';
import {
  ALL_CATEGORIES,
  DEFAULT_PREFS,
  adminNotifTarget,
  notifCategory,
  notifEmoji,
  type Notif,
} from './notifications';

function notif(partial: Partial<Notif>): Notif {
  return {
    id: 'n1',
    type: 'ADMIN_ALERT',
    title: 'Titre',
    body: null,
    data: null,
    is_read: false,
    created_at: new Date().toISOString(),
    ...partial,
  };
}

describe('destination du clic', () => {
  it('suit data.path posé par la base (source de vérité)', () => {
    const n = notif({ data: { path: '/admin/roadmap?task=abc', category: 'tasks' } });
    expect(adminNotifTarget(n)).toBe('/admin/roadmap?task=abc');
  });

  it('ignore un path externe ou relatif (on ne quitte jamais l’app sur un clic)', () => {
    const n = notif({ data: { path: 'https://exemple.test/phishing' } });
    expect(adminNotifTarget(n)).toBe('/admin/notifications');
  });

  it('retombe sur la fiche de tâche quand seul task_id est connu', () => {
    expect(adminNotifTarget(notif({ data: { task_id: 't7' } }))).toBe('/admin/roadmap?task=t7');
  });

  it('ouvre le bon fil pour un message sans path (notification héritée)', () => {
    const n = notif({ type: 'MESSAGE_RECEIVED', data: { conversation_id: 'c9' } });
    expect(adminNotifTarget(n)).toBe('/admin/messages?c=c9');
  });

  it('n’est jamais un cul-de-sac, même sans données', () => {
    expect(adminNotifTarget(notif({ data: null }))).toBe('/admin/notifications');
  });
});

describe('famille d’évènement', () => {
  it('utilise data.category quand la base l’a posée', () => {
    expect(notifCategory(notif({ data: { category: 'billing' } }))).toBe('billing');
  });

  it('rejette une catégorie inconnue et retombe sur le type', () => {
    const n = notif({ type: 'TASK_UPDATE', data: { category: 'inventée' } as never });
    expect(notifCategory(n)).toBe('tasks');
  });

  it('classe les anciennes notifications de message', () => {
    expect(notifCategory(notif({ type: 'MESSAGE_RECEIVED' }))).toBe('messages');
  });

  it('donne toujours une icône', () => {
    expect(notifEmoji(notif({ type: 'INCONNU' }))).toBeTruthy();
  });
});

describe('préférences par défaut', () => {
  it('sans ligne en base, tout est activé (opt-out, pas opt-in)', () => {
    expect(DEFAULT_PREFS.enabled).toBe(true);
    expect(DEFAULT_PREFS.categories).toEqual(ALL_CATEGORIES);
  });

  it('ne se notifie pas de ses propres actions par défaut', () => {
    expect(DEFAULT_PREFS.includeSelf).toBe(false);
  });
});
