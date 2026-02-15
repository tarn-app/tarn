import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenCapture from 'expo-screen-capture';
import { StyleSheet, AppState, AppStateStatus } from 'react-native';

import { paperTheme } from '@/theme';
import { useAuthStore } from '@/lib/store/auth';
import { useCyclesStore } from '@/lib/store/cycles';
import { useShallow } from 'zustand/react/shallow';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Re-export expo-router's ErrorBoundary for file-based errors
export { ErrorBoundary as FileErrorBoundary } from 'expo-router';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { state, initialize, lock, screenshotProtection } = useAuthStore(
    useShallow((s) => ({ state: s.state, initialize: s.initialize, lock: s.lock, screenshotProtection: s.screenshotProtection }))
  );
  const clearStore = useCyclesStore((s) => s.clearStore);
  const router = useRouter();
  const segments = useSegments();
  const appState = useRef(AppState.currentState);

  // Initialize auth state on mount
  useEffect(() => {
    initialize().finally(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  // Screenshot prevention based on user setting
  useEffect(() => {
    if (screenshotProtection) {
      ScreenCapture.preventScreenCaptureAsync();
    } else {
      ScreenCapture.allowScreenCaptureAsync();
    }
    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, [screenshotProtection]);

  // Handle app going to background - lock the app
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App is going to background - lock it
        if (state === 'unlocked' || state === 'duress') {
          lock();
          clearStore(); // Clear in-memory data
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [state, lock, clearStore]);

  // Handle auth state routing
  useEffect(() => {
    if (state === 'loading') return;

    const inAuthGroup = segments[0] === '(authenticated)';
    const inSetup = segments[0] === 'setup';

    if (state === 'setup') {
      // First-time setup - go to welcome
      if (!inSetup) {
        router.replace('/setup/welcome');
      }
    } else if (state === 'locked' || state === 'destructed') {
      // Need to enter PIN
      if (inAuthGroup || inSetup) {
        router.replace('/');
      }
    } else if (state === 'unlocked' || state === 'duress') {
      // Authenticated - go to main app
      if (!inAuthGroup) {
        router.replace('/(authenticated)/calendar');
      }
    }
  }, [state, segments]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <PaperProvider theme={paperTheme}>
        <ErrorBoundary onReset={initialize}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="setup" />
            <Stack.Screen name="(authenticated)" />
          </Stack>
        </ErrorBoundary>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
