import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DATABASE_URL: z.string().default('postgres://enheritage:enheritage_dev@localhost:5432/enheritage'),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ENDPOINT_URL: z.string().url().optional(),
  S3_BUCKET_MEDIA: z.string().default('enheritage-media-dev'),
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
