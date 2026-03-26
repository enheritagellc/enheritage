import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { config } from './config.js';
import sensiblePlugin from './plugins/sensible.js';
import websocketPlugin from './plugins/websocket.js';
import redisPlugin from './plugins/redis.js';
import { healthRoutes } from './routes/health.js';
import { sessionRoutes } from './routes/sessions.js';
import { wsRoutes } from './routes/ws.js';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
    },
  });

  // Plugins
  await app.register(sensiblePlugin);
  await app.register(websocketPlugin);
  await app.register(redisPlugin);

  // Routes
  await app.register(healthRoutes);
  await app.register(sessionRoutes);
  await app.register(wsRoutes);

  return app;
}
