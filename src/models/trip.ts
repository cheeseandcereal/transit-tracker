import { Entity, PrimaryColumn, Column, BaseEntity, ManyToOne, OneToMany, Relation, Between, Index } from 'typeorm';
import { Route } from './route.js';
import { StopTime } from './stopTime.js';
import { bulkInsertOrRemoveItems, getRoundedUTCDateFromOffset, utcDateToYMDFormat } from '../utils.js';
import { getLogger } from '../logger.js';
const logger = getLogger('trip');

@Entity()
export class Trip extends BaseEntity {
  @PrimaryColumn()
  sourceId: string;

  @PrimaryColumn()
  gtfsTripId: string;

  // The date (in local, service time) when this trip is scheduled to start
  // Format YYYY-MM-DD
  @PrimaryColumn()
  tripDate: string;

  @Column({ default: false })
  gotLiveData: boolean;

  @Column({ default: false })
  isCompletedTrip: boolean;

  @Column({ type: 'varchar', nullable: true })
  vehicleId?: string | null;

  @Index()
  @ManyToOne(() => Route, (route) => route.trips)
  route?: Relation<Route>;

  @OneToMany(() => StopTime, (stopTime) => stopTime.trip)
  stopTimes?: Relation<StopTime[]>;

  // Do not edit!
  // These are the auto-generated relationship columns from the parent stop relation above
  @Column({ nullable: true })
  routeSourceId?: string | null;
  @Column({ nullable: true })
  routeGtfsRouteId?: string | null;

  // Updates the parent stop relationship if necessary. Also ensures the relationship is loaded on the local object
  public async updateRouteIfNecessary(route: Route) {
    if (this.routeSourceId !== route.sourceId || this.routeGtfsRouteId !== route.gtfsRouteId) {
      logger.debug(`Trip ${this.gtfsTripId} from ${this.sourceId} has route ${route.gtfsRouteId} - Saving updated relationship`);
      this.route = route;
      await this.save();
    }
    this.route = route;
  }

  public static async getTripWithoutRelations(sourceId: string, tripId: string, ymdDate: string) {
    return Trip.findOne({ where: { sourceId: sourceId, gtfsTripId: tripId, tripDate: ymdDate }, relations: { route: false, stopTimes: false } });
  }

  // Takes a source and trip ID, and a time, and finds the corresponding trip entity closest to the time matching the IDs
  public static async getClosestTripForSourceAndIdWithTime(sourceId: string, tripId: string, time: Date): Promise<Trip | undefined> {
    // We search +/- a full day to account for UTC timezone differences. gtfs schedule works off of whole days, so we should never be more than a day off
    const fromDate = utcDateToYMDFormat(getRoundedUTCDateFromOffset(-1, time));
    const toDate = utcDateToYMDFormat(getRoundedUTCDateFromOffset(1, time));
    const trips = await Trip.find({ where: { sourceId, gtfsTripId: tripId, tripDate: Between(fromDate, toDate) }, relations: { route: false, stopTimes: true } });
    // Search through stops on trips and find the trip with the closest stop to the provided time
    let current: Trip | undefined = undefined;
    let closestOffset = Number.MAX_SAFE_INTEGER;
    trips.forEach((trip) => {
      trip.stopTimes?.forEach((stop) => {
        const offset = Math.abs(stop.scheduledTime - (time.getTime() / 1000));
        if (offset < closestOffset) {
          current = trip;
          closestOffset = offset;
        }
      });
    });
    return current;
  }

  public static async getTripsFromSourceWitStopTimesBetweenDates(sourceId: string, ymdStartDate: string, ymdEndDate: string) {
    const trips = await Trip.find({ where: { sourceId, tripDate: Between(ymdStartDate, ymdEndDate) }, relations: { route: false, stopTimes: true } });
    // Ensure loaded stop times are sorted before returning
    trips.forEach((trip) => {
      if (!trip.stopTimes) trip.stopTimes = [];
      trip.stopTimes.sort((a, b) => (a.stopSequence > b.stopSequence ? 1 : -1));
    });
    return trips;
  }

  public static newTrip(sourceId: string, tripId: string, ymdDate: string, route: Route) {
    const trip = new Trip();
    trip.sourceId = sourceId;
    trip.gtfsTripId = tripId;
    trip.tripDate = ymdDate;
    trip.route = route;
    trip.stopTimes = [];
    return trip;
  }

  public static async bulkCreateTrips(trips: Trip[]) {
    if (trips.length) {
      logger.debug(`Bulk inserting ${trips.length} new trips`);
      await bulkInsertOrRemoveItems(trips, Trip.getRepository());
    }
  }
}
