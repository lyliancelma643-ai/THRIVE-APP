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
      return { pathname: '/(parent)/messages' };
    case '/parent/my-sessions':
      return { pathname: '/(parent)/seances' };
    default:
      return null;
  }
}
