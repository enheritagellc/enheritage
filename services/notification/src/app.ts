import Fastify, { type FastifyInstance } from 'fastify';
import { config } from './config.js';
import sensiblePlugin from './plugins/sensible.js';
import dbPlugin from './plugins/db.js';
import { healthRoutes } from './routes/health.js';
import { notificationRoutes } from './routes/notifications.js';
import { SQSWorker } from './worker/SQSWorker.js';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.LOG_LEVEL } });

  await app.register(sensiblePlugin);
  await app.register(dbPlugin);

  const worker = new SQSWorker(app.db);

  await app.register(healthRoutes);
  await app.register(notificationRoutes(worker));

  app.addHook('onReady', async () => {
    worker.start();
  });

  app.addHook('onClose', async () => {
    worker.stop();
  });

  return app;
}
