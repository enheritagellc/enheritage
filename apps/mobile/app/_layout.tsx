import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';

export default function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="interview/[id]"
              options={{
                headerShown: true,
                title: 'Interview Session',
                headerStyle: { backgroundColor: '#0D1D35' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                presentation: 'modal',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        )}
      </Stack>
    </SafeAreaProvider>
  );
}
