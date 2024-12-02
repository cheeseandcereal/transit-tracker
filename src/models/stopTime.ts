import { Entity, BaseEntity, ManyToOne, Column, PrimaryGeneratedColumn, Relation, Index } from 'typeorm';
import { Trip } from './trip.js';
import { Stop } from './stop.js';
import { bulkInsertOrRemoveItems } from '../utils.js';
import { getLogger } from '../logger.js';
const logger = getLogger('stopTime');

@Entity()
export class StopTime extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sourceId: string;

  @Column({ type: 'integer' })
  stopSequence: number;

  @Column({ type: 'integer' })
  scheduledTime: number;

  @Column({ type: 'integer', nullable: true })
  actualTime?: number | null;

  @Column({ type: 'integer', nullable: true })
  lastUpdatedDataTime?: number | null;

  @Index()
  @ManyToOne(() => Trip, (trip) => trip.stopTimes)
  trip?: Relation<Trip>;

  @Index()
  @ManyToOne(() => Stop)
  stop?: Relation<Stop>;

  // Do not edit!
  // These are the auto-generated relationship columns from the parent stop relation above
  @Column({ nullable: true })
  stopSourceId?: string | null;
  @Column({ nullable: true })
  stopGtfsStopId?: string | null;

  public static newStopTime(sourceId: string, stopSequence: number, scheduledTime: number, trip: Trip, stop: Stop) {
    const stopTime = new StopTime();
    stopTime.sourceId = sourceId;
    stopTime.stopSequence = stopSequence;
    stopTime.scheduledTime = scheduledTime;
    stopTime.trip = trip;
    stopTime.stop = stop;
    return stopTime;
  }

  public static async bulkCreateStopTimes(stopTimes: StopTime[]) {
    if (stopTimes.length) {
      logger.debug(`Bulk inserting ${stopTimes.length} new stop times`);
      await bulkInsertOrRemoveItems(stopTimes, StopTime.getRepository());
    }
  }

  public static async bulkRemoveStopTimes(stopTimes: StopTime[]) {
    if (stopTimes.length) {
      logger.debug(`Bulk removing ${stopTimes.length} stop times`);
      await bulkInsertOrRemoveItems(stopTimes, StopTime.getRepository(), true);
    }
  }
}
