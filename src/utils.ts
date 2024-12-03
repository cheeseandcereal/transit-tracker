import { ObjectLiteral, Repository } from 'typeorm';
import { OrmUtils } from 'typeorm/util/OrmUtils.js';

export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function timeoutPromise(promise: Promise<any>, timeout: number, err: any) {
  let timer: NodeJS.Timeout;
  return Promise.race([new Promise((resolve, reject) => (timer = setTimeout(() => reject(err), timeout))), promise.finally(() => clearTimeout(timer))]);
}

export function toUnixTs(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

export function utcDateToYMDFormat(date: Date) {
  // get[UTC]Month returns a 0-indexed month, and get[UTC]Date does not
  const paddedMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const paddedDate = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${paddedMonth}-${paddedDate}`;
}

// Creates a Date object, which is rounded to exactly midnight (of today in UTC)
// Then applies an offset to move it forward or backwards x days
export function getRoundedUTCDateFromOffset(dayOffset: number, from?: Date) {
  // Translate current UTC date to string YYYY-MM-DD format which is parsed again by a new date to round to midnight
  const date = getRoundedUTCDateFromTime(from ? from : new Date());
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date;
}

export function getRoundedUTCDateFromTime(date: Date) {
  return new Date(utcDateToYMDFormat(date));
}

export function shouldProcessRoute(routes: Set<string>, route: string) {
  return routes.has(route) || routes.has('all');
}

export async function bulkInsertOrRemoveItems<T extends ObjectLiteral>(items: T[], repo: Repository<T>, remove?: boolean) {
  // We do our own chunking with a mix of serial and parallel execution instead of relying on typeorm chunks,
  // since typeorm does a fully parallel Promise.all on all calculated chunks which can cause memory
  // usage issues when saving lots (100k+) of items due to the number of parallel awaited functions
  const serialChunkSize = 100000;
  for (let i = 0; i < items.length; i += serialChunkSize) {
    const serialChunk = items.slice(i, i + serialChunkSize);
    // sqlite driver has a limit of ~1000 depth. Pick a chunk size just below this
    const parallelChunks = OrmUtils.chunk(serialChunk, 990);
    await Promise.all(
      parallelChunks.map(async (chunk) => {
        if (!remove) {
          await repo.insert(chunk);
        } else {
          await repo.remove(chunk);
        }
      }),
    );
  }
}
