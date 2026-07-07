// Config Babel de l'app mobile (Expo + NativeWind v4).
// Doit vivre ICI (et non à la racine du monorepo) : Metro résout la config
// depuis le dossier du projet Expo.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
