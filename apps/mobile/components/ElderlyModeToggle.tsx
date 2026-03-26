import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';

/**
 * A toggle that enables elderly-friendly mode across the mobile app.
 * When active, the app uses larger font sizes and increased tap targets.
 */
export function ElderlyModeToggle() {
  const isElderlyMode = useAuthStore((s) => s.isElderlyMode);
  const toggleElderlyMode = useAuthStore((s) => s.toggleElderlyMode);

  return (
    <View style={styles.container}>
      <View style={styles.labelSection}>
        <Text style={[styles.label, isElderlyMode && styles.labelLarge]}>
          Elderly-friendly mode
        </Text>
        <Text style={[styles.description, isElderlyMode && styles.descriptionLarge]}>
          Larger text, bigger tap targets, simplified layout
        </Text>
      </View>
      <Switch
        value={isElderlyMode}
        onValueChange={toggleElderlyMode}
        trackColor={{ false: '#D0D5DD', true: '#2B5BA8' }}
        thumbColor="#FFFFFF"
        accessibilityRole="switch"
        accessibilityLabel="Toggle elderly-friendly mode"
        accessibilityState={{ checked: isElderlyMode }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  labelSection: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#344054' },
  labelLarge: { fontSize: 17 },
  description: { fontSize: 12, color: '#98A2B3', marginTop: 2 },
  descriptionLarge: { fontSize: 15 },
});
