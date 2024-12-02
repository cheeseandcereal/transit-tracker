import { Entity, PrimaryColumn, Column, BaseEntity, OneToMany, Relation } from 'typeorm';
import { Trip } from './trip.js';
import { bulkInsertOrRemoveItems } from '../utils.js';
import { getLogger } from '../logger.js';
const logger = getLogger('route');

@Entity()
export class Route extends BaseEntity {
  @PrimaryColumn()
  sourceId: string;

  @PrimaryColumn()
  gtfsRouteId: string;

  @Column()
  routeName: string;

  @Column()
  routeLongName: string;

  @Column()
  agencyId: string;

  @OneToMany(() => Trip, (trip) => trip.route)
  trips?: Relation<Trip[]>;

  public async updateFieldsIfNecessary(routeName: string, routeLongName: string, agencyId: string) {
    if (this.routeName !== routeName || this.routeLongName !== routeLongName || this.agencyId !== agencyId) {
      logger.debug(
        `Route name changed: Updating route name from ${this.routeName} to ${routeName}`,
        `and from ${this.routeLongName} to ${routeLongName}`,
        `and agency from ${this.agencyId} to ${agencyId}`,
      );
      await Route.getRepository().update({ sourceId: this.sourceId, gtfsRouteId: this.gtfsRouteId }, { routeName, routeLongName, agencyId });
      this.routeName = routeName;
      this.routeLongName = routeLongName;
      this.agencyId = agencyId;
    }
  }

  public static async getRouteWithoutTrips(sourceId: string, routeId: string) {
    return Route.findOne({ where: { sourceId: sourceId, gtfsRouteId: routeId }, relations: { trips: false } });
  }

  public static async getRoutesFromSourceWithoutTrips(sourceId: string) {
    return Route.find({ where: { sourceId }, relations: { trips: false } });
  }

  public static newRoute(sourceId: string, routeId: string, routeName: string, routeLongName: string, agencyId: string) {
    const route = new Route();
    route.sourceId = sourceId;
    route.gtfsRouteId = routeId;
    route.routeName = routeName;
    route.routeLongName = routeLongName;
    route.agencyId = agencyId;
    route.trips = [];
    return route;
  }

  public static async bulkCreateRoutes(routes: Route[]) {
    if (routes.length) {
      logger.debug(`Bulk inserting ${routes.length} new routes`);
      await bulkInsertOrRemoveItems(routes, Route.getRepository());
    }
  }
}
