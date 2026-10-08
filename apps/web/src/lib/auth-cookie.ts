// Cookie lu par le middleware Next (`sb-access-token`). Il porte le JWT d'accès
// (vérifié côté serveur à chaque navigation protégée). Il reste lisible en JS
// car supabase-js (localStorage) reste la source de la session côté client :
// passer en cookies HttpOnly demande la migration vers @supabase/ssr (v1.1).
// Durée alignée sur l'expiration réelle du JWT (et non 7 jours pour un jeton d'1 h).

/** Durée de vie du cookie en secondes, d'après `exp` du JWT (repli : 1 h). */
export function cookieMaxAge(accessToken: string, nowSec = Math.floor(Date.now() / 1000)): number {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp === 'number') return Math.max(60, payload.exp - nowSec);
  } catch {
    /* jeton illisible : repli */
  }
  return 3600;
}

/** Construit la valeur de `document.cookie`. `Secure` dès que la page est en https. */
export function buildAuthCookie(accessToken: string | null, secure: boolean): string {
  const flags = `path=/; SameSite=Lax${secure ? '; Secure' : ''}`;
  if (!accessToken) return `sb-access-token=; ${flags}; max-age=0`;
  return `sb-access-token=${accessToken}; ${flags}; max-age=${cookieMaxAge(accessToken)}`;
}

export function writeAuthCookie(accessToken: string | null): void {
  if (typeof document === 'undefined') return;
  document.cookie = buildAuthCookie(accessToken, window.location.protocol === 'https:');
}
