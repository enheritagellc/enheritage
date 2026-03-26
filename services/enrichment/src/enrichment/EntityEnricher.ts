/**
 * EntityEnricher — orchestrates provider calls for a batch of NER entities.
 *
 * Strategy per entity type:
 *   PERSON  → Wikipedia
 *   GPE/LOC → Google Maps + Wikipedia
 *   ORG     → Wikipedia
 *   EVENT   → Wikipedia
 *   FAC     → Google Maps
 *   DATE    → skip (no external enrichment needed)
 *   OTHER   → skip
 *
 * Results are cached in Redis keyed by `enrich:{label}:{normalizedText}`.
 */
import pLimit from 'p-limit';
import Redis from 'ioredis';
import { enrichWithWikipedia } from '../providers/WikipediaProvider.js';
import { enrichWithGoogleMaps } from '../providers/GoogleMapsProvider.js';
import { config } from '../config.js';

export type EntityLabel =
  | 'PERSON' | 'ORG' | 'GPE' | 'LOC' | 'DATE'
  | 'EVENT' | 'FAC' | 'NORP' | 'PRODUCT' | 'WORK_OF_ART' | 'OTHER';

export interface RawEntity {
  entity_id: string;
  text: string;
  label: EntityLabel;
  normalized_text?: string;
}

export interface Citation {
  entityId: string;
  entityText: string;
  entityLabel: EntityLabel;
  provider: string;
  url: string;
  title: string;
  snippet: string;
  thumbnailUrl?: string;
  mapsEmbed?: string;
  isPrimary: boolean;
}

export interface EnrichmentResult {
  enrichmentJobId: string;
  transcriptId: string;
  citations: Citation[];
  totalEntities: number;
  enrichedEntities: number;
  failedEntities: number;
}

const SKIPPED_LABELS: Set<EntityLabel> = new Set(['DATE', 'OTHER', 'PRODUCT']);
const PLACE_LABELS: Set<EntityLabel> = new Set(['GPE', 'LOC', 'FAC']);

export class EntityEnricher {
  private readonly limit = pLimit(config.PROVIDER_CONCURRENCY);

  constructor(private readonly redis: Redis) {}

  async enrich(
    enrichmentJobId: string,
    transcriptId: string,
    entities: RawEntity[],
  ): Promise<EnrichmentResult> {
    const capped = entities.slice(0, config.MAX_ENTITIES_PER_JOB);

    let enrichedEntities = 0;
    let failedEntities = 0;
    const citations: Citation[] = [];

    const tasks = capped.map((entity) =>
      this.limit(async () => {
        if (SKIPPED_LABELS.has(entity.label)) return;

        const term = entity.normalized_text?.trim() || entity.text.trim();
        if (!term) return;

        const cacheKey = `enrich:${entity.label}:${term.toLowerCase()}`;
        const cached = await this.redis.get(cacheKey);

        let entityCitations: Citation[];
        if (cached) {
          entityCitations = JSON.parse(cached) as Citation[];
          // Re-attach the current entityId (cache stores provider data only)
          entityCitations = entityCitations.map((c) => ({ ...c, entityId: entity.entity_id }));
        } else {
          try {
            entityCitations = await this.enrichEntity(entity, term);
            // Cache with entityId stripped (so it's reusable across jobs)
            const cacheable = entityCitations.map(({ entityId: _id, ...rest }) => ({
              ...rest,
              entityId: '',
            }));
            await this.redis.setex(cacheKey, config.CACHE_TTL_SECONDS, JSON.stringify(cacheable));
          } catch {
            failedEntities++;
            return;
          }
        }

        if (entityCitations.length > 0) {
          citations.push(...entityCitations);
          enrichedEntities++;
        }
      }),
    );

    await Promise.all(tasks);

    return {
      enrichmentJobId,
      transcriptId,
      citations,
      totalEntities: capped.length,
      enrichedEntities,
      failedEntities,
    };
  }

  private async enrichEntity(entity: RawEntity, term: string): Promise<Citation[]> {
    const results: Citation[] = [];
    const isPlace = PLACE_LABELS.has(entity.label);

    // Wikipedia lookup (all enrichable types)
    const wiki = await enrichWithWikipedia(term);
    if (wiki) {
      results.push({
        entityId: entity.entity_id,
        entityText: entity.text,
        entityLabel: entity.label,
        provider: 'WIKIPEDIA',
        url: wiki.url,
        title: wiki.title,
        snippet: wiki.snippet,
        thumbnailUrl: wiki.thumbnailUrl,
        isPrimary: !isPlace, // Wikipedia is primary for non-places
      });
    }

    // Google Maps lookup (places only)
    if (isPlace) {
      const maps = await enrichWithGoogleMaps(term);
      if (maps) {
        results.push({
          entityId: entity.entity_id,
          entityText: entity.text,
          entityLabel: entity.label,
          provider: 'GOOGLE_MAPS',
          url: maps.mapsUrl,
          title: maps.formattedAddress,
          snippet: `${maps.lat.toFixed(4)}, ${maps.lng.toFixed(4)}`,
          mapsEmbed: maps.mapsEmbed,
          isPrimary: true,
        });
      }
    }

    return results;
  }
}
