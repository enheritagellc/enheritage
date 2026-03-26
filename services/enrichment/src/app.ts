import Fastify, { type FastifyInstance } from 'fastify';
import { config } from './config.js';
import sensiblePlugin from './plugins/sensible.js';
import redisPlugin from './plugins/redis.js';
import { healthRoutes } from './routes/health.js';
import { enrichmentRoutes } from './routes/enrichment.js';
import { SQSWorker } from './worker/SQSWorker.js';

export async function createApp(): Promise<{ app: FastifyInstance; worker: SQSWorker | null }> {
  const app = Fastify({ logger: { level: config.LOG_LEVEL } });

  await app.register(sensiblePlugin);
  await app.register(redisPlugin);
  await app.register(healthRoutes);

  // Worker is created after Redis plugin is registered but before routes need it
  let worker: SQSWorker | null = null;

  app.addHook('onReady', async () => {
    worker = new SQSWorker(app.redis);
    worker.start();
  });

  app.addHook('onClose', async () => {
    worker?.stop();
  });

  // Create a placeholder worker for the route factory (used after onReady fires)
  const routeWorker = new Proxy({} as SQSWorker, {
    get(_target, prop) {
      if (worker) return Reflect.get(worker, prop);
      return () => Promise.reject(new Error('Worker not yet initialised'));
    },
  });

  await app.register(enrichmentRoutes(routeWorker));

  return { app, worker: null }; // worker ref is captured in closure above
}
