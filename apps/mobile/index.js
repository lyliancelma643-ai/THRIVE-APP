// Point d'entrée de l'app mobile.
// 0. Filet de sécurité : une erreur fatale est affichée (message + pile) avant toute fermeture.
// 1. Stockage de session Supabase (AsyncStorage) déposé AVANT tout import du
//    client partagé : sans lui, l'utilisateur serait déconnecté à chaque relance.
// 2. Puis le routeur Expo (racine : src/app).
import './src/lib/fatalGuard';
import './src/lib/auth-storage';
import 'expo-router/entry';
