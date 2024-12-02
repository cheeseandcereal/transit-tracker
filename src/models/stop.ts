import { Entity, PrimaryColumn, Column, BaseEntity, ManyToOne, Relation } from 'typeorm';
import { bulkInsertOrRemoveItems } from '../utils.js';
import { getLogger } from '../logger.js';
const logger = getLogger('stop');

@Entity()
export class Stop extends BaseEntity {
  @PrimaryColumn()
  sourceId: string;

  @PrimaryColumn()
  gtfsStopId: string;

  @Column({ default: '' })
  stopName: string;

  @ManyToOne(() => Stop, { nullable: true })
  parent?: Relation<Stop> | null;

  // Do not edit!
  // These are the auto-generated relationship columns from the parent stop relation above
  @Column({ nullable: true })
  parentSourceId?: string | null;
  @Column({ nullable: true })
  parentGtfsStopId?: string | null;

  // Updates the parent stop relationship if necessary. Also ensures the relationship is loaded on the local object
  public async updateParentIfNecessary(parent?: Stop, logUpdate?: boolean) {
    const parentSourceId = parent?.sourceId || null;
    const parentGtfsStopId = parent?.gtfsStopId || null;
    if ((parent && (this.parentSourceId !== parentSourceId || this.parentGtfsStopId !== parentGtfsStopId)) || (!parent && (this.parentSourceId || this.parentGtfsStopId))) {
      if (logUpdate) {
        logger.debug(`Saving updated parent stop for ${this.gtfsStopId} from ${this.sourceId} with parent stop id ${parent?.gtfsStopId || null}`);
      }
      await Stop.getRepository().update({ sourceId: this.sourceId, gtfsStopId: this.gtfsStopId }, { parentSourceId, parentGtfsStopId });
    }
    this.parent = parent;
    this.parentSourceId = parentSourceId;
    this.parentGtfsStopId = parentGtfsStopId;
  }

  public async updateFieldsIfNecessary(stopName: string) {
    if (this.stopName !== stopName) {
      logger.debug(`Stop name changed: Updating stop name from "${this.stopName}" to "${stopName}"`);
      await Stop.getRepository().update({ sourceId: this.sourceId, gtfsStopId: this.gtfsStopId }, { stopName });
      this.stopName = stopName;
    }
  }

  public static async getStopWithoutParent(sourceId: string, stopId: string) {
    return Stop.findOne({ where: { sourceId: sourceId, gtfsStopId: stopId }, relations: { parent: false } });
  }

  public static async getStopsFromSourceWithoutParent(sourceId: string) {
    return Stop.find({ where: { sourceId }, relations: { parent: false } });
  }

  public static newStop(sourceId: string, stopId: string, stopName: string, parent?: Stop) {
    const stop = new Stop();
    stop.sourceId = sourceId;
    stop.gtfsStopId = stopId;
    stop.stopName = stopName;
    stop.parent = parent;
    return stop;
  }

  public static async bulkCreateStops(stops: Stop[]) {
    if (stops.length) {
      logger.debug(`Bulk inserting ${stops.length} new stops`);
      await bulkInsertOrRemoveItems(stops, Stop.getRepository());
    }
  }
}
