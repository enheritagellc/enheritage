import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@enheritage/types';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Reply: HealthResponse }>(
    '/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok', 'degraded', 'down'] },
              version: { type: 'string' },
              uptime: { type: 'number' },
              timestamp: { type: 'string' },
            },
            required: ['status', 'version', 'uptime', 'timestamp'],
          },
        },
      },
    },
    async (_request, reply) => {
      const response: HealthResponse = {
        status: 'ok',
        version: process.env['npm_package_version'] ?? '0.1.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
      return reply.code(200).send(response);
    },
  );
}
