// Config Metro de l'app mobile — monorepo pnpm + NativeWind v4.
// getSentryExpoConfig = getDefaultConfig d'Expo + identifiants de debug pour
// rattacher les source maps aux crashs (envoyées par EAS Build, jamais publiques).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getSentryExpoConfig(projectRoot);

// Monorepo : surveiller la racine pour résoudre @thrive/shared (workspace pnpm)
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
