import { transit_realtime as gtfsrt } from 'gtfs-realtime-proto';
import { Trip } from '../models/trip.js';
import { StopTime } from '../models/stopTime.js';
import { shouldProcessRoute } from '../utils.js';
import { getLogger } from '../logger.js';

const logger = getLogger('gtfsTripUpdateImporter');

interface timeUpdates {
  [id: string]: number;
}

export class GtfsRealtimeImporter {
  public static async importGtfsScheduleData(sourceId: string, data: gtfsrt.IFeedEntity[], feedUnixTime: number, routeIds: string[]) {
    const routesToProcess = new Set(routeIds);
    const feedTime = new Date(feedUnixTime * 1000);
    const actualTimeUpdates: timeUpdates = {};
    const updatedTimeUpdates: timeUpdates = {};
    const tripsToSave: Trip[] = [];
    await Promise.all(
      data.map(async (entity) => {
        if (!entity.trip_update) {
          logger.warn(
            `Error when processing gtfs rt data from ${sourceId}: trip update information not included in entity; will not process entity.`,
            `Ensure you are using trip update url. Entity: ${entity}`,
          );
          return;
        }
        const tripId = entity.trip_update.trip?.trip_id;
        if (!tripId) {
          logger.warn(
            `Error when processing gtfs rt data from ${sourceId}: missing trip data or trip ID from feed message.`,
            `Will not process entity. Trip data: ${entity.trip_update.trip}`,
          );
          return;
        }
        // @ts-expect-error Only process SCHEDULED trip updates (updates corresponding to the gtfs schedule)
        if (entity.trip_update.trip?.schedule_relationship && entity.trip_update.trip?.schedule_relationship !== gtfsrt.TripDescriptor.ScheduleRelationship.SCHEDULED) return;
        const trip = await Trip.getClosestTripForSourceAndIdWithTime(sourceId, tripId, feedTime);
        // Don't process trip udates for trips we don't have in db, or for trips of routes we aren't watching
        if (!trip || !shouldProcessRoute(routesToProcess, trip.routeGtfsRouteId || '')) return;
        const updated = GtfsRealtimeImporter.processStopTimeUpdates(entity.trip_update.stop_time_update || [], feedUnixTime, trip, actualTimeUpdates, updatedTimeUpdates);
        let saveTrip = false;
        if (updated && !trip.gotLiveData) {
          trip.gotLiveData = true;
          saveTrip = true;
        }
        const vehicle = entity.trip_update.vehicle?.id;
        if (vehicle && trip.vehicleId !== vehicle) {
          trip.vehicleId = vehicle;
          saveTrip = true;
        }
        if (saveTrip) tripsToSave.push(trip);
      }),
    );
    await StopTime.bulkUpdateTimes(actualTimeUpdates, 'actualTime');
    await StopTime.bulkUpdateTimes(updatedTimeUpdates, 'lastUpdatedDataTime');
    await Trip.save(tripsToSave);
    logger.debug(`Updated ${Object.keys(updatedTimeUpdates).length} stop times for ${sourceId}`);
  }

  private static processStopTimeUpdates(
    updates: gtfsrt.TripUpdate.IStopTimeUpdate[],
    updateTime: number,
    trip: Trip,
    actualTimeUpdates: timeUpdates,
    updatedTimeUpdates: timeUpdates,
  ) {
    let updated = false;
    updates.forEach((update) => {
      // @ts-expect-error Only process SCHEDULED trip updates (updates corresponding to the gtfs schedule)
      if (update.schedule_relationship && update.schedule_relationship !== gtfsrt.TripUpdate.StopTimeUpdate.ScheduleRelationship.SCHEDULED) return;
      const stopTime = trip.stopTimes?.find((stopTime) => stopTime.stopSequence === update.stop_sequence || stopTime.stopGtfsStopId === update.stop_id);
      if (!stopTime) {
        logger.warn(`Error processing stop time update from ${trip.sourceId} for ${trip.gtfsTripId}. Did not find corresponding scheduled stop for update from feed: ${update}`);
        return;
      }
      // Prefer to use arrival time data unless it's not available, then fall back to departure times
      const liveTimeEvent = update.arrival ? update.arrival : update.departure;
      let liveTime = liveTimeEvent?.time;
      const liveDelay = liveTimeEvent?.delay;
      if (!liveTime) {
        if (!liveDelay && liveDelay !== 0) {
          logger.warn(`Error processing stop time update from ${trip.sourceId} for ${trip.gtfsTripId}. Did not find live time in stop time update: ${update}`);
          return;
        }
        liveTime = stopTime.scheduledTime + liveDelay;
      }
      if (stopTime.lastUpdatedDataTime !== updateTime) {
        updatedTimeUpdates[stopTime.id] = updateTime;
        if (!updated) updated = true;
      }
      if (stopTime.actualTime !== liveTime) {
        actualTimeUpdates[stopTime.id] = liveTime;
        if (!updated) updated = true;
      }
    });
    return updated;
  }
}
