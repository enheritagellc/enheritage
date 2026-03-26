import { makeServiceClient } from './client';

const client = makeServiceClient(
  (import.meta.env.VITE_INTERVIEW_API_URL as string) || 'http://localhost:3002',
);

export interface SessionState {
  sessionId: string;
  interviewId: string;
  ownerId: string;
  participantCount: number;
  isRecording: boolean;
  sdpOffer?: string;
  sdpAnswer?: string;
  iceCandidates: RTCIceCandidateInit[];
  createdAt: string;
}

export async function createSession(interviewId: string, ownerId: string): Promise<SessionState> {
  const { data } = await client.post<SessionState>('/sessions', { interviewId, ownerId });
  return data;
}

export async function getSession(sessionId: string): Promise<SessionState> {
  const { data } = await client.get<SessionState>(`/sessions/${sessionId}`);
  return data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await client.delete(`/sessions/${sessionId}`);
}

export function connectSignaling(
  sessionId: string,
  onMessage: (msg: { type: string; sessionId: string; payload?: unknown; error?: string }) => void,
  onOpen?: () => void,
  onClose?: () => void,
): WebSocket {
  const wsBase = (import.meta.env.VITE_WS_URL as string) || 'ws://localhost:3002';
  const ws = new WebSocket(`${wsBase}/sessions/${sessionId}/signal`);

  ws.onopen = () => onOpen?.();
  ws.onclose = () => onClose?.();
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string);
      onMessage(msg);
    } catch {
      // ignore malformed frames
    }
  };

  return ws;
}
