import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import jwksRsa from 'jwks-rsa';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

export default fp(async function jwtPlugin(app: FastifyInstance) {
  const jwksClient = jwksRsa({
    jwksUri: `https://${config.AUTH0_DOMAIN}/.well-known/jwks.json`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: config.JWT_CACHE_TTL_SECONDS * 1000,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  await app.register(fastifyJwt, {
    secret: async (_request, token) => {
      const decoded = app.jwt.decode<{ header: { kid?: string } }>(token);
      const kid = (decoded as { header?: { kid?: string } } | null)?.header?.kid;
      if (!kid) {
        throw new Error('JWT header missing kid');
      }
      const signingKey = await jwksClient.getSigningKey(kid);
      return signingKey.getPublicKey();
    },
    verify: {
      algorithms: ['RS256'],
      audience: config.AUTH0_AUDIENCE,
      issuer: `https://${config.AUTH0_DOMAIN}/`,
    },
  });
});
