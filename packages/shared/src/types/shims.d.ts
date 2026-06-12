// Modules natifs présents uniquement côté mobile (Expo).
// Le package shared doit compiler sans eux ; les vrais types
// sont fournis par l'app mobile qui installe ces dépendances.
declare module 'expo-notifications';
declare module 'expo-device';
declare module 'react-native';
