import { Stack } from 'expo-router';

export default function SetupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="create-pin" />
      <Stack.Screen name="done" />
    </Stack>
  );
}
