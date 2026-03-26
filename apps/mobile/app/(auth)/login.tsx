import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuthenticated, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      // In a real implementation this would open the Auth0 browser session
      // using expo-auth-session / expo-web-browser.
      // For now we simulate a successful login after a short delay.
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setUser({
        id: 'mock-user-id',
        email: 'user@example.com',
        firstName: 'Demo',
        lastName: 'User',
        displayName: 'Demo User',
        auth0Sub: 'auth0|mockSub123',
        tier: 'STANDARD' as any,
        role: 'OWNER' as any,
        preferences: {
          notificationChannels: [],
          timezone: 'America/New_York',
          language: 'en-US',
          largeTextMode: false,
          highContrastMode: false,
        },
        isElderlyMode: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
      });
      setAuthenticated(true);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Login Failed', 'Unable to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Branding */}
      <View style={styles.brandingSection}>
        <View style={styles.logoMark}>
          <Text style={styles.logoLetter}>E</Text>
        </View>
        <Text style={styles.appName}>Enheritage</Text>
        <Text style={styles.tagline}>Preserve the stories that matter most</Text>
      </View>

      {/* Features list */}
      <View style={styles.featuresSection}>
        {[
          'Record life story interviews',
          'AI-generated family biographies',
          'Build your family tree',
          'Elderly-friendly design',
        ].map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* Auth button */}
      <View style={styles.authSection}>
        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Sign in with Auth0"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>Sign in with Auth0</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.privacyNote}>
          By signing in you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1D35',
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingVertical: 48,
  },
  brandingSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#C8973A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoLetter: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresSection: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C8973A',
  },
  featureText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
  },
  authSection: {
    gap: 12,
  },
  loginButton: {
    backgroundColor: '#2B5BA8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyNote: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
