import type { WebRTCSessionState } from '@enheritage/types';

export interface SessionState extends WebRTCSessionState {
  sessionId: string;
  interviewId: string;
  ownerId: string;
  sdpOffer?: string;
  sdpAnswer?: string;
  iceCandidates: RTCIceCandidateInit[];
  participantCount: number;
  isRecording: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: number; // Unix timestamp
}

export class SessionStateFactory {
  static create(params: {
    sessionId: string;
    interviewId: string;
    ownerId: string;
    ttlSeconds: number;
  }): SessionState {
    const now = new Date().toISOString();
    return {
      sessionId: params.sessionId,
      interviewId: params.interviewId,
      ownerId: params.ownerId,
      iceCandidates: [],
      participantCount: 0,
      isRecording: false,
      createdAt: now,
      updatedAt: now,
      expiresAt: Math.floor(Date.now() / 1000) + params.ttlSeconds,
    };
  }

  static serialize(state: SessionState): string {
    return JSON.stringify(state);
  }

  static deserialize(raw: string): SessionState {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid session state: not an object');
    }
    return parsed as SessionState;
  }
}
