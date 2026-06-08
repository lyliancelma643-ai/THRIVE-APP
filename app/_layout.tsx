import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View className="flex-1 bg-primary-background">
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(parent)" options={{ headerShown: false }} />
          <Stack.Screen name="role-select" options={{ headerShown: false }} />
          <Stack.Screen name="session/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="player/[id]" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}
