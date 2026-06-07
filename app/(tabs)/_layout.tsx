import { Tabs } from "expo-router";
import { View } from "react-native";
import { Home, Layers, Flame, BarChart2, UserCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#1b263b', // primary.background
          borderBottomWidth: 1,
          borderBottomColor: '#151c2b', // surface.elevated
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTintColor: '#ffffff', // text.primary
        headerTitleStyle: {
          fontFamily: 'Playfair Display',
          fontSize: 24,
        },
        tabBarStyle: {
          backgroundColor: '#1b263b',
          borderTopWidth: 1,
          borderTopColor: '#151c2b',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          height: insets.bottom > 0 ? 60 + insets.bottom : 68,
        },
        tabBarActiveTintColor: '#c5a059', // primary.accent
        tabBarInactiveTintColor: '#cfd5e5', // text.muted
        tabBarLabelStyle: {
          fontFamily: 'SF Pro',
          fontSize: 11,
          marginTop: 4,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          title: "Programme",
          tabBarIcon: ({ color, size }) => (
            <Layers color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Séances",
          tabBarIcon: ({ color, size }) => (
            <Flame color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progression",
          tabBarIcon: ({ color, size }) => (
            <BarChart2 color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <UserCircle color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
