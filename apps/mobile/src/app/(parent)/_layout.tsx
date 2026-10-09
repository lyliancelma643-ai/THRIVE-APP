import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Onglets de l'espace parent. Tout fichier de ce dossier devient un onglet :
// les écrans secondaires sont masqués de la barre avec `href: null`.
const HIDDEN = [
  'children',
  'programs',
  'badges',
  'notifications',
  'abonnement',
  'chat/[conversationId]',
  'activite/[activityId]',
];

export default function ParentLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#000' }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="maison"
        options={{
          title: 'Maison',
          tabBarIcon: ({ color, size }) => <Ionicons name="moon" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bilans"
        options={{
          title: 'Bilans',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      {HIDDEN.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}

export { ErrorBoundary } from '../../components/ErrorBoundary';
