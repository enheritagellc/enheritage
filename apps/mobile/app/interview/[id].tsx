import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VideoCallView } from '../../components/VideoCallView';
import { useSessionStore } from '../../stores/sessionStore';

interface TranscriptEntry {
  speaker: 'you' | 'subject';
  text: string;
  timestamp: string;
}

const MOCK_TRANSCRIPT: TranscriptEntry[] = [
  { speaker: 'you', text: 'Tell me about your earliest memory.', timestamp: '0:00' },
  {
    speaker: 'subject',
    text: "I was about four years old, sitting in my grandmother's kitchen watching her make bread…",
    timestamp: '0:05',
  },
];

const MOCK_PROMPTS = [
  'Tell me about your earliest memory.',
  'What was school like for you?',
  'Who shaped who you became?',
  'What was your first job?',
];

export default function InterviewSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activeSession, startSession, endSession } = useSessionStore();
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(MOCK_TRANSCRIPT);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const isNew = id === 'new';

  useEffect(() => {
    if (isNew) {
      const newId = `session-${Date.now()}`;
      startSession(newId);
    } else if (id && !activeSession) {
      startSession(id);
    }
  }, [id, isNew]);

  const handleEnd = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this interview?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: () => {
            endSession();
            router.back();
          },
        },
      ],
    );
  };

  const toggleRecording = () => {
    setIsRecording((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Video area */}
        <View style={styles.videoArea}>
          <VideoCallView
            sessionId={activeSession?.sessionId ?? null}
            isConnected={!!activeSession}
          />
        </View>

        {/* Controls bar */}
        <View style={styles.controlsBar}>
          <TouchableOpacity
            style={[styles.controlBtn, isRecording && styles.controlBtnActive]}
            onPress={toggleRecording}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <Text style={styles.controlBtnIcon}>{isRecording ? '⏹' : '⏺'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, styles.controlBtnDanger]}
            onPress={handleEnd}
            accessibilityRole="button"
            accessibilityLabel="End session"
          >
            <Text style={styles.controlBtnIcon}>📵</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom panel — split between prompts and transcript */}
        <View style={styles.bottomPanel}>
          {/* Prompts */}
          <View style={styles.promptsSection}>
            <Text style={styles.panelLabel}>PROMPTS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {MOCK_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={[
                    styles.promptChip,
                    activePrompt === prompt && styles.promptChipActive,
                  ]}
                  onPress={() => setActivePrompt(prompt === activePrompt ? null : prompt)}
                >
                  <Text
                    style={[
                      styles.promptChipText,
                      activePrompt === prompt && styles.promptChipTextActive,
                    ]}
                    numberOfLines={2}
                  >
                    {prompt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Transcript */}
          <View style={styles.transcriptSection}>
            <View style={styles.transcriptHeader}>
              <Text style={styles.panelLabel}>TRANSCRIPT</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <ScrollView
              ref={scrollRef}
              style={styles.transcriptScroll}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {transcript.map((entry, i) => (
                <View key={i} style={styles.transcriptEntry}>
                  <Text style={styles.transcriptTimestamp}>{entry.timestamp}</Text>
                  <View style={styles.transcriptContent}>
                    <Text
                      style={[
                        styles.transcriptSpeaker,
                        entry.speaker === 'you' ? styles.speakerYou : styles.speakerSubject,
                      ]}
                    >
                      {entry.speaker === 'you' ? 'You' : 'Subject'}
                    </Text>
                    <Text style={styles.transcriptText}>{entry.text}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D1D35' },
  container: { flex: 1 },
  videoArea: { flex: 1, minHeight: 200 },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    backgroundColor: '#0D1D35',
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnActive: { backgroundColor: '#C8973A' },
  controlBtnDanger: { backgroundColor: 'rgba(239,68,68,0.3)' },
  controlBtnIcon: { fontSize: 20 },
  bottomPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: 300,
    overflow: 'hidden',
  },
  promptsSection: { paddingTop: 16, paddingBottom: 8 },
  panelLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#98A2B3',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  promptChip: {
    backgroundColor: '#F2F4F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    maxWidth: 160,
    marginRight: 4,
  },
  promptChipActive: { backgroundColor: '#E8EEF7' },
  promptChipText: { fontSize: 12, color: '#344054', lineHeight: 16 },
  promptChipTextActive: { color: '#2B5BA8', fontWeight: '500' },
  transcriptSection: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E7EC',
    paddingTop: 12,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  liveText: { fontSize: 10, fontWeight: '700', color: '#10B981', letterSpacing: 0.5 },
  transcriptScroll: { maxHeight: 120, paddingHorizontal: 16 },
  transcriptEntry: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  transcriptTimestamp: { fontSize: 11, color: '#98A2B3', width: 30, marginTop: 2 },
  transcriptContent: { flex: 1 },
  transcriptSpeaker: { fontSize: 11, fontWeight: '600', marginBottom: 1 },
  speakerYou: { color: '#2B5BA8' },
  speakerSubject: { color: '#C8973A' },
  transcriptText: { fontSize: 13, color: '#344054', lineHeight: 18 },
});
