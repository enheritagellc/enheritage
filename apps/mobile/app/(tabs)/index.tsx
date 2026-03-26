import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

interface RecentInterview {
  id: string;
  title: string;
  status: 'completed' | 'scheduled' | 'active';
  date: string;
  durationMinutes?: number;
}

const MOCK_INTERVIEWS: RecentInterview[] = [
  { id: '1', title: "Grandma Rose's Childhood", status: 'completed', date: 'Mar 20', durationMinutes: 47 },
  { id: '2', title: "Dad's War Stories", status: 'scheduled', date: 'Mar 28' },
  { id: '3', title: "Mom's Immigration Journey", status: 'active', date: 'Mar 25', durationMinutes: 12 },
];

const statusColors = {
  completed: '#10B981',
  scheduled: '#F59E0B',
  active: '#2B5BA8',
};

const statusLabels = {
  completed: 'Completed',
  scheduled: 'Scheduled',
  active: 'Live',
};

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.userName}>{user?.firstName ?? 'there'} 👋</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(user?.firstName ?? 'U')[0].toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Quick-start CTA */}
        <TouchableOpacity
          style={styles.ctaCard}
          onPress={() => router.push('/interview/new')}
          accessibilityRole="button"
          accessibilityLabel="Start a new interview"
        >
          <View>
            <Text style={styles.ctaTitle}>Start a New Interview</Text>
            <Text style={styles.ctaSubtitle}>
              Record your loved one's story in minutes
            </Text>
          </View>
          <View style={styles.ctaArrow}>
            <Text style={styles.ctaArrowText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Interviews', value: '3' },
            { label: 'Hours', value: '2.4' },
            { label: 'Biographies', value: '1' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statBox}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent interviews */}
        <Text style={styles.sectionTitle}>Recent Interviews</Text>
        {MOCK_INTERVIEWS.map((interview) => (
          <TouchableOpacity
            key={interview.id}
            style={styles.interviewRow}
            onPress={() => router.push(`/interview/${interview.id}` as any)}
            accessibilityRole="button"
          >
            <View style={[styles.statusDot, { backgroundColor: statusColors[interview.status] }]} />
            <View style={styles.interviewInfo}>
              <Text style={styles.interviewTitle}>{interview.title}</Text>
              <Text style={styles.interviewMeta}>
                {interview.date}
                {interview.durationMinutes != null && ` · ${interview.durationMinutes} min`}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColors[interview.status]}20` }]}>
              <Text style={[styles.statusBadgeText, { color: statusColors[interview.status] }]}>
                {statusLabels[interview.status]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { fontSize: 14, color: '#667085' },
  userName: { fontSize: 22, fontWeight: '700', color: '#101828', marginTop: 2 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2B5BA8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  ctaCard: {
    backgroundColor: '#0D1D35',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  ctaTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  ctaSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  ctaArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C8973A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaArrowText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#101828' },
  statLabel: { fontSize: 11, color: '#98A2B3', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#344054', marginBottom: 12 },
  interviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  interviewInfo: { flex: 1 },
  interviewTitle: { fontSize: 14, fontWeight: '500', color: '#344054' },
  interviewMeta: { fontSize: 12, color: '#98A2B3', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
});
