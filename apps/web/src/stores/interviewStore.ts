import { create } from 'zustand';
import type { WebRTCSessionState } from '@enheritage/types';

interface InterviewState {
  activeSession: WebRTCSessionState | null;
  wsConnection: WebSocket | null;
  isConnected: boolean;
}

interface InterviewActions {
  startSession: (sessionId: string) => void;
  endSession: () => void;
  updateSessionState: (state: Partial<WebRTCSessionState>) => void;
  setWsConnection: (ws: WebSocket | null) => void;
  setIsConnected: (connected: boolean) => void;
}

export const useInterviewStore = create<InterviewState & InterviewActions>((set, get) => ({
  activeSession: null,
  wsConnection: null,
  isConnected: false,

  startSession: (sessionId) =>
    set({
      activeSession: {
        sessionId,
        iceCandidates: [],
        participantCount: 1,
        isRecording: false,
      },
    }),

  endSession: () => {
    const { wsConnection } = get();
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.close();
    }
    set({ activeSession: null, wsConnection: null, isConnected: false });
  },

  updateSessionState: (partial) =>
    set((prev) => ({
      activeSession: prev.activeSession
        ? { ...prev.activeSession, ...partial }
        : null,
    })),

  setWsConnection: (ws) => set({ wsConnection: ws }),
  setIsConnected: (isConnected) => set({ isConnected }),
}));
