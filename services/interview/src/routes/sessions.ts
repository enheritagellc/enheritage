import type { FastifyInstance } from 'fastify';
import { SessionManager } from '../sessions/SessionManager.js';
import type { SessionState } from '../sessions/SessionState.js';

interface CreateSessionBody {
  interviewId: string;
  ownerId: string;
}

interface SessionParams {
  id: string;
}

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  const manager = new SessionManager(app.redis);

  app.post<{ Body: CreateSessionBody; Reply: SessionState }>(
    '/sessions',
    {
      schema: {
        body: {
          type: 'object',
          required: ['interviewId', 'ownerId'],
          properties: {
            interviewId: { type: 'string', format: 'uuid' },
            ownerId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await manager.create(request.body);
      return reply.code(201).send(session);
    },
  );

  app.get<{ Params: SessionParams }>(
    '/sessions/:id',
    async (request, reply) => {
      const session = await manager.get(request.params.id);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }
      return reply.code(200).send(session);
    },
  );

  app.delete<{ Params: SessionParams }>(
    '/sessions/:id',
    async (request, reply) => {
      const deleted = await manager.delete(request.params.id);
      if (!deleted) {
        return reply.code(404).send({ error: 'Session not found' });
      }
      return reply.code(204).send();
    },
  );
}
