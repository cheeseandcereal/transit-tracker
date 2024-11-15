import { FeedFetcher } from '../clients/gtfsDataFetcher.js';
import { timeoutPromise } from '../utils.js';
import { getLogger } from '../logger.js';
const logger = getLogger('FeedWatcher');

const FETCH_PERIOD_MS = 15000;
const FETCH_TIMEOUT_MS = 60000;
let mutex = false;
let interval: any = undefined;

export async function fetchAndProcessFeed() {
  if (mutex) {
    logger.info('Skipping new feed fetching and processing because another is still running');
    return;
  }
  mutex = true;
  try {
    await timeoutPromise(
      (async () => {
        logger.debug('Starting feed fetching/processing');
        const scheduleData = await FeedFetcher.fetchGtfsScheduleData('community_transit');
        const msg = await FeedFetcher.fetchGtfsrtFeedData('community_transit');
        logger.debug(`Parsed gtfs-rt feed version: ${msg.header.gtfs_realtime_version} - timestamp: ${msg.header.timestamp}`);
        logger.info(`Found ${msg.entity.length} messages from gtfs-rt feed`);
        for (const key in scheduleData) {
          logger.debug(`Found ${scheduleData[key]?.length} rows in ${key}`);
        }
        logger.debug('Feed fetching/processing complete');
      })(),
      FETCH_TIMEOUT_MS,
      new Error('Fetch timed out'),
    );
  } catch (e) {
    logger.error('Unexpected error fetching/processing feed:', e);
  }
  mutex = false;
}

export function scheduleFeedProcessor() {
  interval = setInterval(fetchAndProcessFeed, FETCH_PERIOD_MS);
  logger.info(`Now scheduled to fetch and process feeds every ${FETCH_PERIOD_MS / 1000} seconds`);
}

export function unscheduleFeedProcessor() {
  if (interval) clearInterval(interval);
}
