import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { ElderlyModeToggle } from '../../components/ElderlyModeToggle';

interface SettingRow {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isElderlyMode, setAuthenticated } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            setAuthenticated(false);
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  const settingsSections: Array<{ title: string; rows: SettingRow[] }> = [
    {
      title: 'Account',
      rows: [
        { label: 'Display Name', value: user?.displayName ?? '—' },
        { label: 'Email', value: user?.email ?? '—' },
        { label: 'Subscription', value: user?.tier ?? 'FREE' },
      ],
    },
    {
      title: 'Preferences',
      rows: [
        { label: 'Timezone', value: user?.preferences?.timezone ?? '—' },
        { label: 'Language', value: user?.preferences?.language ?? '—' },
      ],
    },
    {
      title: 'Account Actions',
      rows: [
        { label: 'Sign Out', onPress: handleSignOut, danger: true },
      ],
    },
  ];

  const textScale = isElderlyMode ? 1.2 : 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Avatar / header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(user?.firstName ?? 'U')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.profileName, { fontSize: 20 * textScale }]}>
            {user?.displayName ?? 'User'}
          </Text>
          <Text style={[styles.profileEmail, { fontSize: 13 * textScale }]}>
            {user?.email ?? ''}
          </Text>
        </View>

        {/* Elderly mode toggle */}
        <View style={styles.elderlySection}>
          <ElderlyModeToggle />
        </View>

        {/* Settings sections */}
        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.rows.map((row, index) => (
                <TouchableOpacity
                  key={row.label}
                  style={[
                    styles.settingRow,
                    index < section.rows.length - 1 && styles.settingRowBorder,
                  ]}
                  onPress={row.onPress}
                  disabled={!row.onPress}
                  activeOpacity={row.onPress ? 0.7 : 1}
                  accessibilityRole={row.onPress ? 'button' : 'text'}
                >
                  <Text
                    style={[
                      styles.settingLabel,
                      row.danger && styles.settingLabelDanger,
                      { fontSize: 14 * textScale },
                    ]}
                  >
                    {row.label}
                  </Text>
                  {row.value && (
                    <Text style={[styles.settingValue, { fontSize: 13 * textScale }]}>
                      {row.value}
                    </Text>
                  )}
                  {row.onPress && !row.danger && (
                    <Text style={styles.chevron}>›</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.versionText}>Enheritage v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2B5BA8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  profileName: { fontWeight: '700', color: '#101828' },
  profileEmail: { color: '#98A2B3', marginTop: 2 },
  elderlySection: { marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#98A2B3',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  settingRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E7EC',
  },
  settingLabel: { flex: 1, color: '#344054' },
  settingLabelDanger: { color: '#EF4444' },
  settingValue: { color: '#98A2B3', marginRight: 4 },
  chevron: { fontSize: 20, color: '#D0D5DD' },
  versionText: { textAlign: 'center', color: '#D0D5DD', fontSize: 12, marginTop: 8 },
});
