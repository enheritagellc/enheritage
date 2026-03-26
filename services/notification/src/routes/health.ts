import type { FastifyInstance } from 'fastify';
import { supportedEventTypes } from '../channels/templates.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    service: 'notification',
    timestamp: new Date().toISOString(),
    supportedEventTypes: supportedEventTypes(),
  }));
}
