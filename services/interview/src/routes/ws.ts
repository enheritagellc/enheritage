import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { SessionManager } from '../sessions/SessionManager.js';
import { WebRTCSignalingHandler } from '../signaling/WebRTCSignalingHandler.js';

interface WsParams {
  id: string;
}

export async function wsRoutes(app: FastifyInstance): Promise<void> {
  const manager = new SessionManager(app.redis);
  const handler = new WebRTCSignalingHandler(manager);

  app.get<{ Params: WsParams }>(
    '/sessions/:id/signal',
    { websocket: true },
    async (socket: WebSocket, request) => {
      const { id } = request.params;
      await handler.handle(socket, id);
    },
  );
}
