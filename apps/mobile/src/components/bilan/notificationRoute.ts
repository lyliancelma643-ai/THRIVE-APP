// Traduit le `data.path` posé par le serveur (chemins du site web, migration 053)
// en route de l'app mobile. Les chemins de paiement/offre (/parent/upgrade) ne
// mènent nulle part (anti-steering) ; tout chemin inconnu = pas de navigation.

export type MobileTarget = { pathname: string; params?: Record<string, string> };

export function mobileTargetForPath(path: unknown): MobileTarget | null {
  if (typeof path !== 'string' || !path.startsWith('/parent/')) return null;
  const [rawPath, query = ''] = path.split('?');
  const q: Record<string, string> = {};
  for (const part of query.split('&')) {
    if (!part) continue;
    const [k, v = ''] = part.split('=');
    q[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  switch (rawPath) {
    case '/parent/bilans': {
      const params: Record<string, string> = {};
      if (q.child) params.child = q.child;
      if (q.focus) params.focus = q.focus;
      return { pathname: '/(parent)/bilans', params };
    }
    case '/parent/messages':
      // ?c=<conversation> : ouvre le BON fil (coach ou support), comme le web.
      return q.c ? { pathname: '/(parent)/chat/[conversationId]', params: { conversationId: q.c } } : { pathname: '/(parent)/messages' };
    case '/parent/my-sessions':
      return { pathname: '/(parent)/seances' };
    case '/parent/fitness':
      return { pathname: '/(parent)/maison' };
    case '/parent/fitness/carnet':
      return { pathname: '/(parent)/carnet' };
    case '/parent/fitness/programme':
      return { pathname: '/(parent)/programme' };
    case '/parent/fitness/toutes':
      return { pathname: '/(parent)/toutes' };
    default:
      return null;
  }
}
