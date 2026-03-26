import type { WebSocket } from '@fastify/websocket';
import type { SessionManager } from '../sessions/SessionManager.js';

type SignalingMessageType = 'offer' | 'answer' | 'ice-candidate' | 'hangup';

interface SignalingMessage {
  type: SignalingMessageType;
  sessionId: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
}

interface SignalingResponse {
  type: string;
  sessionId: string;
  payload?: unknown;
  error?: string;
}

function send(socket: WebSocket, data: SignalingResponse): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

export class WebRTCSignalingHandler {
  constructor(private readonly sessionManager: SessionManager) {}

  async handle(socket: WebSocket, sessionId: string): Promise<void> {
    const session = await this.sessionManager.get(sessionId);
    if (!session) {
      send(socket, { type: 'error', sessionId, error: 'Session not found' });
      socket.close(1008, 'Session not found');
      return;
    }

    // Increment participant count
    await this.sessionManager.update(sessionId, {
      participantCount: session.participantCount + 1,
    });

    send(socket, { type: 'connected', sessionId, payload: { sessionId } });

    socket.on('message', async (raw: Buffer | string) => {
      let message: SignalingMessage;
      try {
        message = JSON.parse(raw.toString()) as SignalingMessage;
      } catch {
        send(socket, { type: 'error', sessionId, error: 'Invalid JSON message' });
        return;
      }

      try {
        await this.handleMessage(socket, sessionId, message);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        send(socket, { type: 'error', sessionId, error: msg });
      }
    });

    socket.on('close', async () => {
      const current = await this.sessionManager.get(sessionId);
      if (current) {
        await this.sessionManager.update(sessionId, {
          participantCount: Math.max(0, current.participantCount - 1),
        });
      }
    });
  }

  private async handleMessage(
    socket: WebSocket,
    sessionId: string,
    message: SignalingMessage,
  ): Promise<void> {
    switch (message.type) {
      case 'offer': {
        if (!message.sdp) {
          send(socket, { type: 'error', sessionId, error: 'offer requires sdp' });
          return;
        }
        const updated = await this.sessionManager.update(sessionId, { sdpOffer: message.sdp });
        send(socket, { type: 'offer-received', sessionId, payload: updated });
        break;
      }

      case 'answer': {
        if (!message.sdp) {
          send(socket, { type: 'error', sessionId, error: 'answer requires sdp' });
          return;
        }
        const updated = await this.sessionManager.update(sessionId, { sdpAnswer: message.sdp });
        send(socket, { type: 'answer-received', sessionId, payload: updated });
        break;
      }

      case 'ice-candidate': {
        if (!message.candidate) {
          send(socket, { type: 'error', sessionId, error: 'ice-candidate requires candidate' });
          return;
        }
        const updated = await this.sessionManager.addIceCandidate(sessionId, message.candidate);
        send(socket, { type: 'ice-candidate-received', sessionId, payload: updated });
        break;
      }

      case 'hangup': {
        await this.sessionManager.delete(sessionId);
        send(socket, { type: 'hangup-acknowledged', sessionId });
        socket.close(1000, 'Session ended by participant');
        break;
      }

      default: {
        send(socket, { type: 'error', sessionId, error: `Unknown message type: ${(message as SignalingMessage).type}` });
      }
    }
  }
}
