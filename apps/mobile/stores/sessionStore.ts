import { create } from 'zustand';
import type { WebRTCSessionState } from '@enheritage/types';

interface SessionState {
  activeSession: WebRTCSessionState | null;
  wsConnection: WebSocket | null;
  isConnected: boolean;
  connectionError: string | null;
}

interface SessionActions {
  startSession: (sessionId: string) => void;
  endSession: () => void;
  updateSession: (patch: Partial<WebRTCSessionState>) => void;
  setWsConnection: (ws: WebSocket | null) => void;
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
}

export const useSessionStore = create<SessionState & SessionActions>((set, get) => ({
  activeSession: null,
  wsConnection: null,
  isConnected: false,
  connectionError: null,

  startSession: (sessionId) =>
    set({
      activeSession: {
        sessionId,
        iceCandidates: [],
        participantCount: 1,
        isRecording: false,
      },
      connectionError: null,
    }),

  endSession: () => {
    const { wsConnection } = get();
    if (wsConnection) {
      try {
        wsConnection.close();
      } catch {
        // Ignore close errors
      }
    }
    set({
      activeSession: null,
      wsConnection: null,
      isConnected: false,
      connectionError: null,
    });
  },

  updateSession: (patch) =>
    set((prev) => ({
      activeSession: prev.activeSession
        ? { ...prev.activeSession, ...patch }
        : null,
    })),

  setWsConnection: (ws) => set({ wsConnection: ws }),
  setConnected: (isConnected) => set({ isConnected }),
  setConnectionError: (connectionError) => set({ connectionError }),
}));
