import dayjs from 'dayjs';
import dayjsutc from 'dayjs/plugin/utc.js';
import dayjstz from 'dayjs/plugin/timezone.js';
import { Route } from '../models/route.js';
import { Stop } from '../models/stop.js';
import { Trip } from '../models/trip.js';
import { StopTime } from '../models/stopTime.js';
import { shouldProcessRoute, utcDateToYMDFormat } from '../utils.js';
import { getLogger } from '../logger.js';
import type { CSVRow, ParsedGtfsData } from '../types.js';

const logger = getLogger('gtfsScheduleImporter');

dayjs.extend(dayjsutc);
dayjs.extend(dayjstz);

interface routesById {
  [routeId: string]: Route | undefined;
}

interface stopsById {
  [stopId: string]: Stop | undefined;
}

interface tripsById {
  [tripId: string]: Trip[] | undefined;
}

export class GtfsScheduleImporter {
  public static async importGtfsScheduleData(sourceId: string, data: ParsedGtfsData, routeIds: string[], onOrAfter: Date, onOrBefore: Date) {
    const routesToProcess = new Set(routeIds);
    const routes = await GtfsScheduleImporter.getOrGenerateRoutes(sourceId, data, routesToProcess);
    logger.debug(`Loaded ${Object.keys(routes).length} routes for ${sourceId}`);
    const stops = await GtfsScheduleImporter.getOrGenerateStops(sourceId, data);
    logger.debug(`Loaded ${Object.keys(stops).length} stops for ${sourceId}`);
    const trips = await GtfsScheduleImporter.getOrGenerateTrips(sourceId, data, routes, onOrAfter, onOrBefore);
    let tripInstances = 0;
    let tripStopTimes = 0;
    Object.values(trips).forEach((trips) => {
      tripInstances += trips?.length || 0;
      trips?.forEach((trip) => (tripStopTimes += trip.stopTimes?.length || 0));
    });
    logger.debug(`Loaded ${Object.keys(trips).length} trips (${tripInstances} instances and ${tripStopTimes} existing stop times) for ${sourceId}`);
    await GtfsScheduleImporter.getOrGenerateStopTimes(sourceId, data, trips, stops);
    let stopTimes = 0;
    Object.values(trips).forEach((trips) => trips?.forEach((trip) => (stopTimes += trip.stopTimes?.length || 0)));
    logger.debug(`Loaded all ${stopTimes} stop times for ${sourceId}`);
  }

  private static async getOrGenerateRoutes(sourceId: string, data: ParsedGtfsData, routes: Set<string>) {
    const routeMap: routesById = {};
    const newRoutes: Route[] = [];
    // Load current routes
    (await Route.getRoutesFromSourceWithoutTrips(sourceId)).forEach((route) => {
      if (shouldProcessRoute(routes, route.gtfsRouteId)) {
        routeMap[route.gtfsRouteId] = route;
      }
    });
    for (const row of data['routes.txt']) {
      // Get and validate fields
      const id = row.route_id;
      const routeName = row.route_short_name || row.route_long_name;
      const routeLongName = row.route_long_name || row.route_short_name;
      const agencyId = row.agency_id || '';
      if (!id || !routeName || !routeLongName) {
        logger.warn(
          `Error when processing routes.txt from ${sourceId}: one of route_id, or (not route_short_name and not route_long_name) are not defined but required by spec.`,
          `Will not process/save this route. Row: ${row}`,
        );
        continue;
      }
      if (!shouldProcessRoute(routes, id)) continue;
      // Get (and conditionally update) or create route
      let route = routeMap[id];
      if (!route) {
        route = Route.newRoute(sourceId, id, routeName, routeLongName, agencyId);
        newRoutes.push(route);
        routeMap[route.gtfsRouteId] = route;
      } else {
        // Update fields that may have changed if necessary
        await route.updateFieldsIfNecessary(routeName, routeLongName, agencyId);
      }
    }
    // Save all new routes to db
    await Route.bulkCreateRoutes(newRoutes);
    return routeMap;
  }

  private static async getOrGenerateStops(sourceId: string, data: ParsedGtfsData) {
    const stopMap: stopsById = {};
    const relationsToProcess: { [stopId: string]: string | undefined } = {};
    const newStops: Stop[] = [];
    // Load current stops
    (await Stop.getStopsFromSourceWithoutParent(sourceId)).forEach((stop) => {
      stopMap[stop.gtfsStopId] = stop;
    });
    let firstProcess = false;
    if (Object.keys(stopMap).length === 0) firstProcess = true;
    for (const row of data['stops.txt']) {
      // Get and validate fields
      const id = row.stop_id;
      const stopName = row.stop_name || '';
      const parentId = row.parent_station;
      if (!id) {
        logger.warn(`Error when processing stops.txt from ${sourceId}: stop_id is not defined but required by spec.`, `Will not process/save this stop. Row: ${row}`);
        continue;
      }
      if (parentId) {
        relationsToProcess[id] = parentId;
      }
      // Get (and conditionally update) or create stop
      let stop = stopMap[id];
      if (!stop) {
        stop = Stop.newStop(sourceId, id, stopName);
        newStops.push(stop);
        stopMap[stop.gtfsStopId] = stop;
      } else {
        // Update fields that may have changed if necessary
        await stop.updateFieldsIfNecessary(stopName);
      }
    }
    // Save all new stops to db
    await Stop.bulkCreateStops(newStops);
    // Now that all stops are loaded, process/update parent relationships as necessary
    await Promise.all(
      Object.values(stopMap).map(async (stop) => {
        await stop?.updateParentIfNecessary(stopMap[relationsToProcess[stop.gtfsStopId] || ''], !firstProcess);
      }),
    );
    return stopMap;
  }

  private static getTimezoneByAgency(sourceId: string, data: ParsedGtfsData) {
    const timezoneByAgency: { [agencyId: string]: string | undefined } = {};
    const agencyLength = data['agency.txt']?.length || 0;
    data['agency.txt'].forEach((row) => {
      const id = row.agency_id || '';
      const tz = row.agency_timezone;
      if (!tz) {
        logger.warn(`Error when processing agency.txt from ${sourceId}: agency_timezone is not defined but required by spec.`, `Will not process/save this agency. Row: ${row}`);
        return;
      }
      timezoneByAgency[id] = tz;
      if (agencyLength <= 1) timezoneByAgency[''] = tz;
    });
    return timezoneByAgency;
  }

  private static getServiceIdsPerDay(sourceId: string, data: ParsedGtfsData) {
    const serviceWithDates: { [serviceId: string]: Date[] | undefined } = {};
    // Parse service ids from calendar.txt
    for (const row of data['calendar.txt'] || []) {
      const id = row.service_id;
      const mon = row.monday;
      const tue = row.tuesday;
      const wed = row.wednesday;
      const thu = row.thursday;
      const fri = row.friday;
      const sat = row.saturday;
      const sun = row.sunday;
      const startStr = row.start_date;
      const endStr = row.end_date;
      if (!id || !mon || !tue || !wed || !thu || !fri || !sat || !sun || !startStr || !endStr) {
        logger.warn(
          `Error when processing calendar.txt from ${sourceId}: one of the required columns are not defined but required by spec.`,
          `Will not process/save this service id. Row: ${row}`,
        );
        continue;
      }
      const serviceDays = [sun === '1', mon === '1', tue === '1', wed === '1', thu === '1', fri === '1', sat === '1'];
      const serviceDates: Date[] = [];
      let currentDate = parseGtfsDate(startStr);
      const endDate = parseGtfsDate(endStr);
      while (currentDate.getTime() <= endDate.getTime()) {
        if (serviceDays[currentDate.getUTCDay()]) {
          serviceDates.push(currentDate);
        }
        const newDate = new Date(currentDate);
        newDate.setUTCDate(currentDate.getUTCDate() + 1);
        currentDate = newDate;
      }
      serviceWithDates[id] = serviceDates;
    }
    // Update service ids/dates with data from calendar_dates.txt as applicable
    for (const row of data['calendar_dates.txt'] || []) {
      const id = row.service_id;
      const dateStr = row.date;
      const exType = row.exception_type;
      if (!id || !dateStr || !exType) {
        logger.warn(
          `Error when processing calendar_dates.txt from ${sourceId}: one of the required columns are not defined but required by spec.`,
          `Will not process/save this service id/updates. Row: ${row}`,
        );
        continue;
      }
      const date = parseGtfsDate(dateStr);
      if (exType === '1') {
        // Service added
        const serviceDates = serviceWithDates[id] || [];
        serviceDates.push(date);
        serviceDates.sort((a, b) => a.getTime() - b.getTime());
        serviceWithDates[id] = serviceDates;
      } else if (exType === '2') {
        // Service removed
        const existing = serviceWithDates[id];
        if (existing) {
          serviceWithDates[id] = existing.filter((item) => item.getTime() !== date.getTime());
        }
      }
    }
    return serviceWithDates;
  }

  private static async getOrGenerateTrips(sourceId: string, data: ParsedGtfsData, routes: routesById, onOrAfter: Date, onOrBefore: Date) {
    const tripMap: tripsById = {};
    const newTrips: Trip[] = [];
    const services = GtfsScheduleImporter.getServiceIdsPerDay(sourceId, data);
    (await Trip.getTripsFromSourceWitStopTimesBetweenDates(sourceId, utcDateToYMDFormat(onOrAfter), utcDateToYMDFormat(onOrBefore))).forEach((trip) => {
      const existing = tripMap[trip.gtfsTripId] || [];
      existing.push(trip);
      tripMap[trip.gtfsTripId] = existing;
    });
    for (const row of data['trips.txt']) {
      const routeId = row.route_id;
      const serviceId = row.service_id;
      const tripId = row.trip_id;
      if (!routeId || !serviceId || !tripId) {
        logger.warn(
          `Error when processing trips.txt from ${sourceId}: one of the required columns are not defined but required by spec.`,
          `Will not process/save this trip. Row: ${row}`,
        );
        continue;
      }
      const serviceDates = services[serviceId];
      const route = routes[routeId];
      if (!route) continue; // Not processing this trip to due filters
      if (!serviceDates) {
        logger.warn(`Error when processing trips.txt from ${sourceId}: did not find either service ${serviceId} for trip.`, `Will not process/save this trip. Row: ${row}`);
        continue;
      }
      for (const date of serviceDates.filter((date) => date.getTime() >= onOrAfter.getTime() && date.getTime() <= onOrBefore.getTime())) {
        // Get (and conditionally update) or create trip
        const tripDate = utcDateToYMDFormat(date);
        let trip = (tripMap[tripId] || []).find((trip) => trip.tripDate === tripDate);
        if (!trip) {
          trip = Trip.newTrip(sourceId, tripId, tripDate, route);
          newTrips.push(trip);
          const existing = tripMap[trip.gtfsTripId] || [];
          existing.push(trip);
          tripMap[trip.gtfsTripId] = existing;
        } else {
          // Update fields that may have changed if necessary
          await trip.updateRouteIfNecessary(route);
        }
      }
    }
    // Save all new trips to db
    await Trip.bulkCreateTrips(newTrips);
    return tripMap;
  }

  private static getStopTimesByTripId(sourceId: string, data: ParsedGtfsData) {
    const stopTimesByTrip: { [tripId: string]: CSVRow[] | undefined } = {};
    for (const row of data['stop_times.txt']) {
      const tripId = row.trip_id;
      if (!tripId) {
        logger.warn(`Error when processing stop_times.txt from ${sourceId}: trip_id is not defined but required by spec.`, `Will not process/save this stop time. Row: ${row}`);
        continue;
      }
      const existing = stopTimesByTrip[tripId] || [];
      existing.push(row);
      stopTimesByTrip[tripId] = existing;
    }
    return stopTimesByTrip;
  }

  private static generateStopTimeSequenceData(sourceId: string, tripStopTimes: CSVRow[], stopsById: stopsById) {
    // Generate a stop time sequence from the gtfs schedule data for 1 trip
    // (with all the data we need from gtfs schedule to generate a new stop time)
    const stopTimeSequence: { stop: Stop; time: string; stopSequence: number }[] = [];
    for (const row of tripStopTimes) {
      // HH:MM:SS format (H:MM:SS is also accepted) - dayjs can parse both of these correctly
      const time = row.arrival_time || row.departure_time || '';
      if (!time) {
        logger.warn(
          `Error when processing stop_times.txt from ${sourceId}: Could not find arrival_time or departure_time.`,
          `This application cannot process stop times without explicit times, will not process/save this stop time. Row: ${row}`,
        );
        continue;
      }
      const stop = stopsById[row.stop_id || ''];
      if (!stop) {
        logger.warn(
          `Error when processing stop_times.txt from ${sourceId}: Could not find stop_id and/or corresponding stop ${row.stop_id}`,
          `This application cannot process stop times without explicit defined stops, will not process/save this stop time. Row: ${row}`,
        );
        continue;
      }
      const stopSequence = row.stop_sequence ? parseInt(row.stop_sequence) : NaN;
      if (isNaN(stopSequence) || stopSequence < 0) {
        logger.warn(
          `Error when processing stop_times.txt from ${sourceId}: stop_sequence does not exist or is not valid as required by spec.`,
          `Will not process/save this stop time. Row: ${row}`,
        );
        continue;
      }
      stopTimeSequence.push({ stop, time, stopSequence });
    }
    stopTimeSequence.sort((a, b) => (a.stopSequence > b.stopSequence ? 1 : -1));
    return stopTimeSequence;
  }

  private static async getOrGenerateStopTimes(sourceId: string, data: ParsedGtfsData, tripsById: tripsById, stopsById: stopsById) {
    const newStopTimes: StopTime[] = [];
    const removeStopTimes: StopTime[] = [];
    const tzs = GtfsScheduleImporter.getTimezoneByAgency(sourceId, data);
    const stopTimesByTripId = GtfsScheduleImporter.getStopTimesByTripId(sourceId, data);
    for (const tripId of Object.keys(stopTimesByTripId)) {
      // Find corresponding loaded trips array previously loaded from DB corresponding with the gtfs stop times for this trip
      const trips = tripsById[tripId] || [];
      if (!trips.length) continue; // Not processing this trip due to filters
      const timezone = tzs[trips[0].route?.agencyId || ''];
      if (!timezone) {
        logger.warn(
          `Error when processing stop_times.txt from ${sourceId}: Could not find valid timezone for agency from trip ${tripId}.`,
          `Will not process/save this stop time. Agency id: ${trips[0].route?.agencyId}`,
        );
        continue;
      }
      const stopTimeSequence = GtfsScheduleImporter.generateStopTimeSequenceData(sourceId, stopTimesByTripId[tripId] || [], stopsById);
      // Compare stopTimeSequence (from gtfs schedule data) to existing trip stop times (from db), updating any differences as needed
      for (const trip of trips) {
        if (!trip.stopTimes) {
          logger.warn(
            `Error when processing stop times for ${sourceId}: trip loaded from DB does not have stop times array.`,
            `This should never happen. Will skip loading stop time for this trip ${trip.gtfsTripId} ${trip.tripDate}`,
          );
          continue;
        }
        for (let i = 0; i < trip.stopTimes.length || i < stopTimeSequence.length; i++) {
          const dbTripStopTime = trip.stopTimes[i];
          const scheduleStopData = stopTimeSequence[i];
          // Get unix timestamp of gtfs scheduled time, parsing with appropriate timezone from the agency of the trip
          const scheduleTime = dayjs.tz(`${trip.tripDate}T${scheduleStopData?.time || '00:00:00'}`, timezone).unix();
          if (
            dbTripStopTime?.stopSequence === scheduleStopData?.stopSequence &&
            dbTripStopTime?.scheduledTime === scheduleTime &&
            dbTripStopTime?.stopGtfsStopId === scheduleStopData?.stop.gtfsStopId
          ) {
            // Stops in db are same as the current gtfs schedule; nothing to update
            continue;
          }
          // remove [possibly] existing stop which was previously saved and is no longer in the schedule from db
          if (dbTripStopTime) removeStopTimes.push(dbTripStopTime);
          // add [possibly] new or updated stop from gtfs schedule which doesn't currently exist in db
          if (scheduleStopData) {
            const newStopTime = StopTime.newStopTime(sourceId, scheduleStopData.stopSequence, scheduleTime, trip, scheduleStopData.stop);
            trip.stopTimes[i] = newStopTime;
            newStopTimes.push(newStopTime);
          } else if (dbTripStopTime) {
            // Mark item for removal from trip stop times since it's not replaced with another stop time from the schedule
            // These will get removed by a filter on the trip stop times after processing is complete below
            trip.stopTimes[i] = undefined as any;
          }
        }
        // Remove stops marked for removal from trip relationship array
        trip.stopTimes = trip.stopTimes.filter(Boolean);
      }
    }
    await StopTime.bulkCreateStopTimes(newStopTimes);
    await StopTime.bulkRemoveStopTimes(removeStopTimes);
  }
}

function parseGtfsDate(date: string): Date {
  const year = date.substring(0, 4);
  const month = date.substring(4, 6);
  const day = date.substring(6, 8);
  return new Date(`${year}-${month}-${day}`);
}
