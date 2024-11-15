import { Entity, PrimaryColumn, Column, BaseEntity, ManyToOne, OneToMany, Relation } from 'typeorm';
import { Route } from './route.js';
import { StopTime } from './stopTime.js';

@Entity()
export class Trip extends BaseEntity {
  @PrimaryColumn()
  sourceId: string;

  @PrimaryColumn()
  gtfsTripId: string;

  @PrimaryColumn({ type: 'date' })
  date: string;

  @Column({ default: false })
  gotLiveData: boolean;

  @Column({ default: false })
  isCompletedTrip: boolean;

  @ManyToOne(() => Route, (route) => route.trips)
  route: Relation<Route>;

  @OneToMany(() => StopTime, (stopTime) => stopTime.trip)
  stopTimes: Relation<StopTime[]>;
}
