import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  RTCView,
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
} from 'react-native-webrtc';

interface VideoCallViewProps {
  sessionId: string | null;
  isConnected: boolean;
}

const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function VideoCallView({ sessionId, isConnected }: VideoCallViewProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function initMedia() {
      setIsInitializing(true);
      setError(null);

      try {
        const stream = (await mediaDevices.getUserMedia({
          audio: true,
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })) as MediaStream;

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream);

        const pc = new RTCPeerConnection(RTC_CONFIGURATION);
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        pc.addEventListener('track', (event: any) => {
          const [remote] = event.streams as MediaStream[];
          if (remote) setRemoteStream(remote);
        });

        pc.addEventListener('icecandidate', (event: any) => {
          if (event.candidate) {
            // In production: send candidate to signalling server via WebSocket
          }
        });

        pc.addEventListener('connectionstatechange', () => {
          if (pc.connectionState === 'failed') {
            setError('Connection failed. Please check your network and retry.');
          }
        });
      } catch (err) {
        if (!cancelled) {
          setError('Could not access camera/microphone. Please check permissions.');
        }
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    initMedia();

    return () => {
      cancelled = true;
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      setLocalStream(null);
      setRemoteStream(null);
    };
  }, [sessionId]);

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (isInitializing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator color="#C8973A" size="large" />
        <Text style={styles.statusText}>Initialising camera…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Remote video (full area) */}
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
          mirror={false}
        />
      ) : (
        <View style={[styles.remoteVideo, styles.centerContent]}>
          <ActivityIndicator color="#C8973A" size="large" />
          <Text style={styles.statusText}>
            {isConnected ? 'Waiting for participant…' : 'Not connected'}
          </Text>
        </View>
      )}

      {/* Local video (picture-in-picture) */}
      {localStream && (
        <View style={styles.localVideoContainer}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={true}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1D35',
    position: 'relative',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  remoteVideo: {
    flex: 1,
  },
  localVideoContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 90,
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  statusText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
