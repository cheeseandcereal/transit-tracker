import 'source-map-support/register.js';
import 'reflect-metadata'; // for TypeORM
import { scheduleFeedProcessor, unscheduleFeedProcessor, scheduleScheduleProcessor, unscheduleScheduleProcessor, fetchAndProcessSchedules } from './listeners/gtfsWatcher.js';
import { Database } from './clients/database.js';
import { getLogger } from './logger.js';
const logger = getLogger('main');

// Configure protobufjs to not use long.js
// all 64 bit defined integers in protobuf protocol fit into js numbers for this application
import protobuf from 'protobufjs';
protobuf.util.Long = null as any;
protobuf.configure();

async function main() {
  logger.info('Starting Transit Tracker');
  await Database.initialize();
  await fetchAndProcessSchedules();
  scheduleFeedProcessor();
  scheduleScheduleProcessor();
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
  unscheduleScheduleProcessor();
  await Database.shutdown();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((e) => {
  logger.error('Uncaught fatal error:', e);
  process.exit(1);
});
