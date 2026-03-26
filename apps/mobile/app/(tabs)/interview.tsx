import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSessionStore } from '../../stores/sessionStore';

export default function InterviewTab() {
  const router = useRouter();
  const { activeSession, endSession } = useSessionStore();

  const handleStartNew = () => {
    router.push('/interview/new' as any);
  };

  const handleResumeSession = () => {
    if (activeSession) {
      router.push(`/interview/${activeSession.sessionId}` as any);
    }
  };

  if (activeSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Active session card */}
          <View style={styles.activeCard}>
            <View style={styles.liveDot} />
            <Text style={styles.activeTitle}>Session In Progress</Text>
            <Text style={styles.activeSessionId}>
              ID: {activeSession.sessionId.slice(0, 8)}…
            </Text>
            <View style={styles.sessionStats}>
              <View style={styles.sessionStat}>
                <Text style={styles.sessionStatValue}>{activeSession.participantCount}</Text>
                <Text style={styles.sessionStatLabel}>Participants</Text>
              </View>
              <View style={styles.sessionStatDivider} />
              <View style={styles.sessionStat}>
                <Text style={styles.sessionStatValue}>
                  {activeSession.isRecording ? 'On' : 'Off'}
                </Text>
                <Text style={styles.sessionStatLabel}>Recording</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={handleResumeSession}
              accessibilityRole="button"
            >
              <Text style={styles.resumeButtonText}>Resume Session</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.endButton}
              onPress={endSession}
              accessibilityRole="button"
            >
              <Text style={styles.endButtonText}>End Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Interviews</Text>
        <Text style={styles.pageSubtitle}>
          Start a new session or schedule one for later
        </Text>

        {/* Start now */}
        <TouchableOpacity
          style={styles.startCard}
          onPress={handleStartNew}
          accessibilityRole="button"
          accessibilityLabel="Start a new interview now"
        >
          <View style={styles.startIcon}>
            <Text style={styles.startIconText}>▶</Text>
          </View>
          <View style={styles.startCardContent}>
            <Text style={styles.startCardTitle}>Start Interview Now</Text>
            <Text style={styles.startCardSubtitle}>
              Begin a video or audio session immediately
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for a great session</Text>
          {[
            'Find a quiet, well-lit room',
            'Ensure both devices are charged',
            'Have a glass of water nearby',
            'Plan for 30–60 minutes',
          ].map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#101828' },
  pageSubtitle: { fontSize: 14, color: '#667085', marginTop: 4, marginBottom: 24 },
  startCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  startIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2B5BA8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startIconText: { color: '#FFFFFF', fontSize: 18 },
  startCardContent: { flex: 1 },
  startCardTitle: { fontSize: 15, fontWeight: '600', color: '#344054' },
  startCardSubtitle: { fontSize: 12, color: '#98A2B3', marginTop: 2 },
  chevron: { fontSize: 22, color: '#98A2B3', fontWeight: '300' },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  tipsTitle: { fontSize: 13, fontWeight: '600', color: '#344054', marginBottom: 4 },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipBullet: { color: '#C8973A', fontSize: 14, marginTop: 1 },
  tipText: { fontSize: 13, color: '#667085', flex: 1 },
  // Active session styles
  activeCard: {
    margin: 20,
    backgroundColor: '#0D1D35',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  activeTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  activeSessionId: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  sessionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginVertical: 8,
  },
  sessionStat: { alignItems: 'center' },
  sessionStatValue: { color: '#C8973A', fontSize: 24, fontWeight: '700' },
  sessionStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  sessionStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },
  resumeButton: {
    backgroundColor: '#2B5BA8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  resumeButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  endButton: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  endButtonText: { color: '#EF4444', fontSize: 14, fontWeight: '500' },
});
