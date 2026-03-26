import { createApp } from './app.js';
import { config } from './config.js';

async function main(): Promise<void> {
  const { app } = await createApp();
  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    app.log.info(`Keepsake render service listening on port ${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
