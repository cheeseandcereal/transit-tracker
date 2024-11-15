import { Entity, BaseEntity, ManyToOne, Column, UpdateDateColumn, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Trip } from './trip.js';
import { Stop } from './stop.js';

@Entity()
export class StopTime extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sourceId: string;

  @Column({ type: 'datetime' })
  scheduledTime: Date;

  @Column({ type: 'datetime', nullable: true })
  actualTime?: Date;

  @ManyToOne(() => Trip, (trip) => trip.stopTimes)
  trip: Relation<Trip>;

  @ManyToOne(() => Stop)
  stop: Relation<Stop>;

  @UpdateDateColumn()
  lastUpdated: Date;
}
