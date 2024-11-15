import { Readable } from 'node:stream';
import { buffer as consumeStreamToBuffer } from 'node:stream/consumers';
import { promisify } from 'node:util';
import { got, Response } from 'got';
import { parse as parseCsv } from 'csv-parse/sync';
import { Entry, fromBuffer, Options, ZipFile } from 'yauzl';
import { transit_realtime as gtfsrt } from 'gtfs-realtime-proto';
import { Config } from './configuration.js';
import { getLogger } from '../logger.js';
import type { ParsedGtfsData } from '../types.js';

const unzipFromBuffer: (b: Buffer, o: Options) => Promise<ZipFile> = promisify(fromBuffer);

const logger = getLogger('feedFetcher');

export class FeedFetcher {
  public static got = got.extend({
    throwHttpErrors: false,
    timeout: { request: 30000 },
  });

  public static async fetchGtfsrtFeedData(sourceId: string) {
    const url = getDataSourceURLs(sourceId).gtfs_rt_feed;
    const response = await FeedFetcher.got.get(url);
    checkFetchResponse(url, response);

    return gtfsrt.FeedMessage.decode(response.rawBody);
  }

  public static async fetchGtfsScheduleData(sourceId: string) {
    const url = getDataSourceURLs(sourceId).gtfs_schedule;
    const response = await FeedFetcher.got.get(url);
    checkFetchResponse(url, response);

    // Unzip each file in zipped response body into an object keyed by file name, where its value is an array of parsed csv rows
    const gtfsDataByFile: ParsedGtfsData = {} as any;
    const zipFile = await unzipFromBuffer(response.rawBody, { lazyEntries: true });
    const openReadStream: (e: Entry) => Promise<Readable> = promisify(zipFile.openReadStream.bind(zipFile));
    zipFile.readEntry();
    zipFile.on('entry', async (entry: Entry) => {
      const stream = await openReadStream(entry);
      if (entry.fileName.endsWith('.txt')) {
        // Parse contents of txt file as a CSV and save to object we are returning later
        gtfsDataByFile[entry.fileName] = parseCsv(await consumeStreamToBuffer(stream), { columns: true, skipEmptyLines: true });
      } else {
        // Consume stream to continue reading zip, even though contents are unneeded
        await consumeStreamToBuffer(stream);
      }
      zipFile.readEntry();
    });
    // Ensure full zip file is processed before continuing
    await new Promise((resolve) => zipFile.on('end', resolve));

    // Perform some light validation on the parsed data before returning
    const validationError = new Error(`Error validating gtfs schedule data from ${url} - either malformed or missing required schedule data`);
    ['agency.txt', 'routes.txt', 'stop_times.txt', 'trips.txt', 'stops.txt'].forEach((name) => {
      if (!gtfsDataByFile[name] || gtfsDataByFile[name].length === 0) throw validationError;
    });
    if (!gtfsDataByFile['calendar.txt'] && !gtfsDataByFile['calendar_dates.txt']) throw validationError;

    return gtfsDataByFile;
  }
}

function getDataSourceURLs(sourceId: string) {
  for (const datasource of Config.getConfig().datasources) {
    if (datasource.source_id === sourceId) return datasource;
  }
  throw new Error(`Could not find data source with ID ${sourceId}`);
}

function checkFetchResponse(url: string, response: Response) {
  if (response.statusCode !== 200) {
    logger.error(`Bad response while fetching URL ${url} - Status: ${response.statusCode}\n${response.body}`);
    throw new Error(`Bad response when fetching ${url}`);
  }
}
