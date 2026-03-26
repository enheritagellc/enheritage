import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { config } from './config.js';
import sensiblePlugin from './plugins/sensible.js';
import { healthRoutes } from './routes/health.js';
import { uploadRoutes } from './routes/upload.js';
import { assetRoutes } from './routes/assets.js';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
    },
  });

  // Plugins
  await app.register(sensiblePlugin);

  // Routes
  await app.register(healthRoutes);
  await app.register(uploadRoutes);
  await app.register(assetRoutes);

  return app;
}
