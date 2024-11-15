import { Entity, PrimaryColumn, Column, BaseEntity, ManyToOne, Relation } from 'typeorm';

@Entity()
export class Stop extends BaseEntity {
  @PrimaryColumn()
  sourceId: string;

  @PrimaryColumn()
  gtfsStopId: string;

  @Column({ nullable: true })
  stopName?: string;

  @ManyToOne(() => Stop, { nullable: true })
  parent?: Relation<Stop>;
}
