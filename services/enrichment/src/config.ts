import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // AWS
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ENDPOINT_URL: z.string().url().optional(),
  S3_BUCKET_MEDIA: z.string().default('enheritage-media-dev'),
  SQS_ENRICHMENT_QUEUE_URL: z.string().default(''),
  SQS_BIOGRAPHY_QUEUE_URL: z.string().default(''),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // External APIs (all optional — providers are skipped if key not set)
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEWS_API_KEY: z.string().optional(),
  WIKIPEDIA_API_URL: z.string().default('https://en.wikipedia.org/api/rest_v1'),

  // Enrichment limits
  MAX_ENTITIES_PER_JOB: z.coerce.number().int().positive().default(50),
  PROVIDER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86400), // 24 hours
});

export type AppConfig = z.infer<typeof schema>;

function load(): AppConfig {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `  ${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Invalid environment:\n${errors}`);
  }
  return result.data;
}

export const config = load();
