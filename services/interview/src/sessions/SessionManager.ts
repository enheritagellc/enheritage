import type Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { SessionStateFactory, type SessionState } from './SessionState.js';
import { config } from '../config.js';

export class SessionManager {
  private readonly keyPrefix = 'session:';

  constructor(private readonly redis: Redis) {}

  private key(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }

  async create(params: { interviewId: string; ownerId: string }): Promise<SessionState> {
    const sessionId = uuidv4();
    const state = SessionStateFactory.create({
      sessionId,
      interviewId: params.interviewId,
      ownerId: params.ownerId,
      ttlSeconds: config.SESSION_TTL_SECONDS,
    });

    await this.redis.set(
      this.key(sessionId),
      SessionStateFactory.serialize(state),
      'EX',
      config.SESSION_TTL_SECONDS,
    );

    return state;
  }

  async get(sessionId: string): Promise<SessionState | null> {
    const raw = await this.redis.get(this.key(sessionId));
    if (!raw) return null;
    return SessionStateFactory.deserialize(raw);
  }

  async update(sessionId: string, patch: Partial<SessionState>): Promise<SessionState | null> {
    const existing = await this.get(sessionId);
    if (!existing) return null;

    const updated: SessionState = {
      ...existing,
      ...patch,
      sessionId: existing.sessionId, // immutable
      updatedAt: new Date().toISOString(),
    };

    const ttl = await this.redis.ttl(this.key(sessionId));
    const remainingTtl = ttl > 0 ? ttl : config.SESSION_TTL_SECONDS;

    await this.redis.set(
      this.key(sessionId),
      SessionStateFactory.serialize(updated),
      'EX',
      remainingTtl,
    );

    return updated;
  }

  async delete(sessionId: string): Promise<boolean> {
    const deleted = await this.redis.del(this.key(sessionId));
    return deleted > 0;
  }

  async addIceCandidate(
    sessionId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<SessionState | null> {
    const existing = await this.get(sessionId);
    if (!existing) return null;
    return this.update(sessionId, {
      iceCandidates: [...existing.iceCandidates, candidate],
    });
  }
}
