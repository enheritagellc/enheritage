import type { FastifyInstance } from 'fastify';

interface VerifyBody {
  token: string;
}

interface DecodedClaims {
  sub: string;
  email?: string;
  role?: string;
  tier?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

interface VerifyResponse {
  valid: boolean;
  claims: DecodedClaims;
}

export async function verifyRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: VerifyBody; Reply: VerifyResponse | { error: string } }>(
    '/verify',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              valid: { type: 'boolean' },
              claims: {
                type: 'object',
                properties: {
                  sub: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  tier: { type: 'string' },
                  iat: { type: 'number' },
                  exp: { type: 'number' },
                },
                required: ['sub'],
              },
            },
            required: ['valid', 'claims'],
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { token } = request.body;
        const decoded = await request.jwtVerify<DecodedClaims>({
          // override to verify the provided token, not Authorization header
          onlyCookie: false,
        } as Parameters<typeof request.jwtVerify>[0]);

        // jwtVerify reads Authorization header; decode the provided token manually
        const claims = app.jwt.decode<DecodedClaims>(token);
        if (!claims || !claims.sub) {
          return reply.code(401).send({ error: 'Invalid token: missing sub claim' });
        }

        // Verify using app.jwt.verify (synchronous RS256 verify)
        const verified = app.jwt.verify<DecodedClaims>(token);

        return reply.code(200).send({
          valid: true,
          claims: {
            sub: verified.sub,
            email: verified.email,
            role: verified.role,
            tier: verified.tier,
            iat: verified.iat,
            exp: verified.exp,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Token verification failed';
        return reply.code(401).send({ error: message });
      }
    },
  );
}
