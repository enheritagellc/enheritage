import Fastify, { type FastifyInstance } from 'fastify';
import { config } from './config.js';
import sensiblePlugin from './plugins/sensible.js';
import dbPlugin from './plugins/db.js';
import { healthRoutes } from './routes/health.js';
import { vaultRoutes } from './routes/vaults.js';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.LOG_LEVEL } });

  await app.register(sensiblePlugin);
  await app.register(dbPlugin);

  await app.register(healthRoutes);
  await app.register(vaultRoutes);

  return app;
}
