import type { ConfigContext, ExpoConfig } from 'expo/config';

// Surcouche dynamique de app.json (qui reste la source de vérité statique).
// extra.eas.projectId n'est posé QUE si EAS_PROJECT_ID est défini (env shell,
// apps/mobile/.env ou variables EAS) : un placeholder non-UUID ferait échouer
// getExpoPushTokenAsync et les commandes EAS. Sans valeur, la clé est absente
// et usePushNotifications retombe sur Constants.easConfig (builds EAS).
export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EAS_PROJECT_ID?.trim();
  const extra = { ...(config.extra ?? {}) };
  if (projectId) extra.eas = { ...(extra.eas ?? {}), projectId };
  return { ...config, extra } as ExpoConfig;
};
