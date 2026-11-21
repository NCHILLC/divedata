import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FollowsProvider } from '../follows';
import { color } from '../ui';

export default function RootLayout() {
  return (
    <FollowsProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: color.background },
          headerStyle: { backgroundColor: color.surface },
          headerTintColor: color.text,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </FollowsProvider>
  );
}
