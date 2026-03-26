import fp from 'fastify-plugin';
import pg from 'pg';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: pg.Pool;
  }
}

export default fp(async function dbPlugin(app: FastifyInstance) {
  const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 10 });

  await pool.query('SELECT 1'); // verify connection on startup

  app.decorate('db', pool);

  app.addHook('onClose', async () => {
    await pool.end();
  });
});
