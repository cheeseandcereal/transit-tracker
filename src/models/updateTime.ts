import { Entity, PrimaryColumn, Column, BaseEntity } from 'typeorm';
import { toUnixTs } from '../utils.js';

@Entity()
export class UpdateTime extends BaseEntity {
  @PrimaryColumn()
  sourceId: string;

  @Column({ type: 'integer' })
  lastProcessedScheduleTime: number;

  @Column({ type: 'integer' })
  lastProcessedFeedTime: number;

  @Column({
    type: 'varchar',
    transformer: {
      from: (val: string) => new Set(val.split(',').filter(Boolean)),
      to: (val: Set<string>) => [...val].join(','),
    },
  })
  lastProcessedRoutes: Set<string>;

  public static async needsScheduleProcess(sourceId: string, routes: string[]) {
    const updateTime = await UpdateTime.findOne({ where: { sourceId } });
    if (!updateTime) return true; // If this source hasn't been processed before
    for (const route of routes) {
      // If this source was last processed without a route we have now
      if (!updateTime.lastProcessedRoutes.has(route)) return true;
    }
    // If this source was last processed over 3 hours ago
    const threeHours = 60 * 60 * 3;
    return toUnixTs(new Date()) - threeHours > updateTime.lastProcessedScheduleTime;
  }

  public static async updateLastProcessedScheduleTime(sourceId: string, routes: string[]) {
    let updateTime = await UpdateTime.findOne({ where: { sourceId } });
    if (!updateTime) {
      updateTime = new UpdateTime();
      updateTime.sourceId = sourceId;
      updateTime.lastProcessedFeedTime = 0;
    }
    updateTime.lastProcessedRoutes = new Set(routes);
    updateTime.lastProcessedScheduleTime = toUnixTs(new Date());
    await updateTime.save();
  }

  public static async lastProcessedFeedTime(sourceId: string) {
    return (await UpdateTime.findOne({ where: { sourceId } }))?.lastProcessedFeedTime || 0;
  }

  public static async updateLastProcessedFeedTime(sourceId: string, time: number) {
    await UpdateTime.getRepository().update({ sourceId }, { lastProcessedFeedTime: time });
  }
}
