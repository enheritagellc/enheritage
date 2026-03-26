import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('postgres://enheritage:enheritage_dev@localhost:5432/enheritage'),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ENDPOINT_URL: z.string().url().optional(),
  SQS_NOTIFICATION_QUEUE_URL: z.string().default(''),
  SES_FROM_ADDRESS: z.string().email().default('noreply@enheritage.com'),
  SES_FROM_NAME: z.string().default('Enheritage'),
  SNS_SMS_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  // When true, log the notification but do not call SES/SNS — safe for dev/LocalStack
  DRY_RUN: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
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
