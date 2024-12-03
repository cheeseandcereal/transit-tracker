import { Config } from '../clients/configuration.js';
import { FeedFetcher } from '../clients/gtfsDataFetcher.js';
import { UpdateTime } from '../models/updateTime.js';
import { GtfsScheduleImporter } from '../utils/gtfsScheduleImporter.js';
import { GtfsRealtimeImporter } from '../utils/gtfsTripUpdateImporter.js';
import { getRoundedUTCDateFromOffset, timeoutPromise, utcDateToYMDFormat } from '../utils.js';
import { getLogger } from '../logger.js';
const logger = getLogger('GtfsWatcher');

const RT_PROCESS_PERIOD_MS = 1000 * 15; // 15 seconds
const RT_PROCESS_TIMEOUT_MS = 1000 * 60 * 5; // 5 minutes
const SCHEDULE_PERIOD_MS = 1000 * 60 * 60 * 6; // 6 hours
let mutex = false;
let feedInterval: any = undefined;
let scheduleInterval: any = undefined;

export async function fetchAndProcessFeeds() {
  if (mutex) {
    logger.info('Skipping new feed fetching and processing because another is still running');
    return;
  }
  mutex = true;
  try {
    await timeoutPromise(
      (async () => {
        logger.debug('Starting feed fetching/processing');
        for (const datasource of Config.getConfig().datasources) {
          logger.debug(`Fetching gtfs-rt feed for ${datasource.source_id}`);
          const msg = await FeedFetcher.fetchGtfsrtFeedData(datasource.source_id);
          const ts = msg.header.timestamp;
          if (!ts) {
            logger.warn(`Did not find required timestamp for trip updates message from gtfs-rt feed from ${datasource.source_id} - Will not process feed`);
            continue;
          }
          if ((await UpdateTime.lastProcessedFeedTime(datasource.source_id)) !== ts) {
            logger.debug(`Processing gtfs-rt trip updates feed for ${datasource.source_id} with ${msg.entity?.length} messages - ts: ${ts}`);
            await GtfsRealtimeImporter.importGtfsScheduleData(datasource.source_id, msg.entity || [], ts, datasource.routes);
            await UpdateTime.updateLastProcessedFeedTime(datasource.source_id, ts);
            logger.debug(`Finished processing gtfs-rt feed for ${datasource.source_id}`);
          } else {
            logger.debug(`Latest gtfs-rt feed data already up to date for ${datasource.source_id}`);
          }
        }
        logger.debug('Finished feed fetching/processing');
      })(),
      RT_PROCESS_TIMEOUT_MS,
      new Error('Fetch timed out'),
    );
  } catch (e) {
    logger.error('Unexpected error fetching/processing feed:', e);
  }
  mutex = false;
}

export async function fetchAndProcessSchedules() {
  try {
    // Only process the schedule for dates on/between 2 days old up to 2 days in the future (all UTC time)
    // This helps us avoid processing/writing schedule data that isn't necessary yet at this point in time
    const onOrAfter = getRoundedUTCDateFromOffset(-2);
    const onOrBefore = getRoundedUTCDateFromOffset(2);
    logger.info(`Starting schedule fetching/processing for dates between ${utcDateToYMDFormat(onOrAfter)} and ${utcDateToYMDFormat(onOrBefore)}`);
    for (const datasource of Config.getConfig().datasources) {
      if (await UpdateTime.needsScheduleProcess(datasource.source_id, datasource.routes)) {
        logger.debug(`Fetching gtfs schedule data for ${datasource.source_id}`);
        const scheduleData = await FeedFetcher.fetchGtfsScheduleData(datasource.source_id);
        logger.debug(`Processing schedule data for ${datasource.source_id} - routes: ${datasource.routes}`);
        await GtfsScheduleImporter.importGtfsScheduleData(datasource.source_id, scheduleData, datasource.routes, onOrAfter, onOrBefore);
        await UpdateTime.updateLastProcessedScheduleTime(datasource.source_id, datasource.routes);
        logger.debug(`Finished importing/updating schedule data for ${datasource.source_id}`);
      } else {
        logger.debug(`Schedule processing not currently needed for ${datasource.source_id}; skipping`);
      }
    }
    logger.info('Finished schedule fetching/processing');
  } catch (e) {
    logger.error('Unexpected error fetching/processing feed:', e);
  }
}

export function scheduleFeedProcessor() {
  feedInterval = setInterval(fetchAndProcessFeeds, RT_PROCESS_PERIOD_MS);
  logger.info(`Now scheduled to fetch and process feeds every ${RT_PROCESS_PERIOD_MS / 1000} seconds`);
}

export function unscheduleFeedProcessor() {
  if (feedInterval) clearInterval(feedInterval);
}

export function scheduleScheduleProcessor() {
  scheduleInterval = setInterval(fetchAndProcessSchedules, SCHEDULE_PERIOD_MS);
  logger.info(`Now scheduled to fetch and process feeds every ${SCHEDULE_PERIOD_MS / 1000 / 60} minutes`);
}

export function unscheduleScheduleProcessor() {
  if (scheduleInterval) clearInterval(scheduleInterval);
}
