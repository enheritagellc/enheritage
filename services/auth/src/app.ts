import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { config } from './config.js';
import sensiblePlugin from './plugins/sensible.js';
import rateLimitPlugin from './plugins/rateLimit.js';
import jwtPlugin from './plugins/jwt.js';
import { healthRoutes } from './routes/health.js';
import { verifyRoutes } from './routes/verify.js';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
    },
  });

  // Plugins
  await app.register(sensiblePlugin);
  await app.register(rateLimitPlugin);
  await app.register(jwtPlugin);

  // Routes
  await app.register(healthRoutes);
  await app.register(verifyRoutes);

  return app;
}
