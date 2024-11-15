import 'source-map-support/register.js';
import 'reflect-metadata'; // for TypeORM
import { scheduleFeedProcessor, unscheduleFeedProcessor, fetchAndProcessFeed } from './listeners/feedWatcher.js';
import { Database } from './clients/database.js';
import { getLogger } from './logger.js';
const logger = getLogger('main');

async function main() {
  logger.info('Starting Transit Tracker');
  await Database.initialize();
  await fetchAndProcessFeed();
  if (!process.env.alwaystrue) process.exit(0);
  scheduleFeedProcessor();
}

let stopSignalReceived = false;
export async function shutdown() {
  if (stopSignalReceived) {
    logger.error('Ungraceful forced termination - stop signal receieved multiple times');
    process.exit(1);
  }
  stopSignalReceived = true;
  logger.info('Shutting down - stop signal received');
  // Clean up and shutdown stuff here
  unscheduleFeedProcessor();
  await Database.shutdown();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((e) => {
  logger.error('Uncaught fatal error:', e);
  process.exit(1);
});
