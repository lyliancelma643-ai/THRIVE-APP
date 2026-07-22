// Déploiement progressif du Mode Terrain.
// Actif par défaut ; `NEXT_PUBLIC_FIELD_MODE=off` le retire sans redéployer
// de code — le mode standard reste alors seul, strictement inchangé.
export const FIELD_MODE_ENABLED = process.env.NEXT_PUBLIC_FIELD_MODE !== 'off';
