import { Entity, PrimaryColumn, Column, BaseEntity, OneToMany, Relation } from 'typeorm';
import { Trip } from './trip.js';

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

  @OneToMany(() => Trip, (trip) => trip.route)
  trips: Relation<Trip[]>;
}
