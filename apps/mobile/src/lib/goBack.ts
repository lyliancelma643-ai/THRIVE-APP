/** Retour = vraie histoire de navigation ; repli sûr quand il n'y a rien derrière (lien profond, rechargement). */
type BackRouter = { canGoBack: () => boolean; back: () => void; replace: (href: never) => void };

export function goBack(router: BackRouter, fallback: string): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}
