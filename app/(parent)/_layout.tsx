import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, Baby, BookOpen, BarChart2, MessageCircle, UserCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ParentLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1b263b',
          borderTopWidth: 1,
          borderTopColor: '#151c2b',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          height: insets.bottom > 0 ? 60 + insets.bottom : 68,
        },
        tabBarActiveTintColor: '#c5a059',
        tabBarInactiveTintColor: '#cfd5e5',
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="children"
        options={{
          title: 'Enfants',
          tabBarIcon: ({ color, size }) => <Baby color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          title: 'Programme',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Bilans',
          tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile-parent"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} />,
        }}
      />
      {/* Screens sans onglet visible */}
      <Tabs.Screen name="child-detail" options={{ href: null }} />
      <Tabs.Screen name="report-detail" options={{ href: null }} />
      <Tabs.Screen name="sessions-20min" options={{ href: null }} />
    </Tabs>
  );
}
