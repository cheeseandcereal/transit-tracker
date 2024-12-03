/* eslint-disable */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Base1000000000000 implements MigrationInterface {
  name = 'Base1000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "update_time" ("sourceId" varchar PRIMARY KEY NOT NULL, "lastProcessedScheduleTime" integer NOT NULL, "lastProcessedFeedTime" integer NOT NULL, "lastProcessedRoutes" varchar NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE "route" ("sourceId" varchar NOT NULL, "gtfsRouteId" varchar NOT NULL, "routeName" varchar NOT NULL, "routeLongName" varchar NOT NULL, "agencyId" varchar NOT NULL, PRIMARY KEY ("sourceId", "gtfsRouteId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "trip" ("sourceId" varchar NOT NULL, "gtfsTripId" varchar NOT NULL, "tripDate" varchar NOT NULL, "gotLiveData" boolean NOT NULL DEFAULT (0), "isCompletedTrip" boolean NOT NULL DEFAULT (0), "vehicleId" varchar, "routeSourceId" varchar, "routeGtfsRouteId" varchar, PRIMARY KEY ("sourceId", "gtfsTripId", "tripDate"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_758efe4b05b24a9abbc38095ba" ON "trip" ("routeSourceId", "routeGtfsRouteId") `);
    await queryRunner.query(
      `CREATE TABLE "stop" ("sourceId" varchar NOT NULL, "gtfsStopId" varchar NOT NULL, "stopName" varchar NOT NULL DEFAULT (''), "parentSourceId" varchar, "parentGtfsStopId" varchar, PRIMARY KEY ("sourceId", "gtfsStopId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "stop_time" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sourceId" varchar NOT NULL, "stopSequence" integer NOT NULL, "scheduledTime" integer NOT NULL, "actualTime" integer, "lastUpdatedDataTime" integer, "stopSourceId" varchar, "stopGtfsStopId" varchar, "tripSourceId" varchar, "tripGtfsTripId" varchar, "tripTripDate" varchar)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_999f874afb81edd6470fdfe7ef" ON "stop_time" ("tripSourceId", "tripGtfsTripId", "tripTripDate") `);
    await queryRunner.query(`CREATE INDEX "IDX_04b97543d717ddf4cfdd22e218" ON "stop_time" ("stopSourceId", "stopGtfsStopId") `);
    await queryRunner.query(`DROP INDEX "IDX_758efe4b05b24a9abbc38095ba"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_trip" ("sourceId" varchar NOT NULL, "gtfsTripId" varchar NOT NULL, "tripDate" varchar NOT NULL, "gotLiveData" boolean NOT NULL DEFAULT (0), "isCompletedTrip" boolean NOT NULL DEFAULT (0), "vehicleId" varchar, "routeSourceId" varchar, "routeGtfsRouteId" varchar, CONSTRAINT "FK_758efe4b05b24a9abbc38095ba9" FOREIGN KEY ("routeSourceId", "routeGtfsRouteId") REFERENCES "route" ("sourceId", "gtfsRouteId") ON DELETE NO ACTION ON UPDATE NO ACTION, PRIMARY KEY ("sourceId", "gtfsTripId", "tripDate"))`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_trip"("sourceId", "gtfsTripId", "tripDate", "gotLiveData", "isCompletedTrip", "vehicleId", "routeSourceId", "routeGtfsRouteId") SELECT "sourceId", "gtfsTripId", "tripDate", "gotLiveData", "isCompletedTrip", "vehicleId", "routeSourceId", "routeGtfsRouteId" FROM "trip"`,
    );
    await queryRunner.query(`DROP TABLE "trip"`);
    await queryRunner.query(`ALTER TABLE "temporary_trip" RENAME TO "trip"`);
    await queryRunner.query(`CREATE INDEX "IDX_758efe4b05b24a9abbc38095ba" ON "trip" ("routeSourceId", "routeGtfsRouteId") `);
    await queryRunner.query(
      `CREATE TABLE "temporary_stop" ("sourceId" varchar NOT NULL, "gtfsStopId" varchar NOT NULL, "stopName" varchar NOT NULL DEFAULT (''), "parentSourceId" varchar, "parentGtfsStopId" varchar, CONSTRAINT "FK_36077f05f3f4406b593302908ed" FOREIGN KEY ("parentSourceId", "parentGtfsStopId") REFERENCES "stop" ("sourceId", "gtfsStopId") ON DELETE NO ACTION ON UPDATE NO ACTION, PRIMARY KEY ("sourceId", "gtfsStopId"))`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_stop"("sourceId", "gtfsStopId", "stopName", "parentSourceId", "parentGtfsStopId") SELECT "sourceId", "gtfsStopId", "stopName", "parentSourceId", "parentGtfsStopId" FROM "stop"`,
    );
    await queryRunner.query(`DROP TABLE "stop"`);
    await queryRunner.query(`ALTER TABLE "temporary_stop" RENAME TO "stop"`);
    await queryRunner.query(`DROP INDEX "IDX_999f874afb81edd6470fdfe7ef"`);
    await queryRunner.query(`DROP INDEX "IDX_04b97543d717ddf4cfdd22e218"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_stop_time" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sourceId" varchar NOT NULL, "stopSequence" integer NOT NULL, "scheduledTime" integer NOT NULL, "actualTime" integer, "lastUpdatedDataTime" integer, "stopSourceId" varchar, "stopGtfsStopId" varchar, "tripSourceId" varchar, "tripGtfsTripId" varchar, "tripTripDate" varchar, CONSTRAINT "FK_999f874afb81edd6470fdfe7ef1" FOREIGN KEY ("tripSourceId", "tripGtfsTripId", "tripTripDate") REFERENCES "trip" ("sourceId", "gtfsTripId", "tripDate") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_04b97543d717ddf4cfdd22e2184" FOREIGN KEY ("stopSourceId", "stopGtfsStopId") REFERENCES "stop" ("sourceId", "gtfsStopId") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_stop_time"("id", "sourceId", "stopSequence", "scheduledTime", "actualTime", "lastUpdatedDataTime", "stopSourceId", "stopGtfsStopId", "tripSourceId", "tripGtfsTripId", "tripTripDate") SELECT "id", "sourceId", "stopSequence", "scheduledTime", "actualTime", "lastUpdatedDataTime", "stopSourceId", "stopGtfsStopId", "tripSourceId", "tripGtfsTripId", "tripTripDate" FROM "stop_time"`,
    );
    await queryRunner.query(`DROP TABLE "stop_time"`);
    await queryRunner.query(`ALTER TABLE "temporary_stop_time" RENAME TO "stop_time"`);
    await queryRunner.query(`CREATE INDEX "IDX_999f874afb81edd6470fdfe7ef" ON "stop_time" ("tripSourceId", "tripGtfsTripId", "tripTripDate") `);
    await queryRunner.query(`CREATE INDEX "IDX_04b97543d717ddf4cfdd22e218" ON "stop_time" ("stopSourceId", "stopGtfsStopId") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_04b97543d717ddf4cfdd22e218"`);
    await queryRunner.query(`DROP INDEX "IDX_999f874afb81edd6470fdfe7ef"`);
    await queryRunner.query(`ALTER TABLE "stop_time" RENAME TO "temporary_stop_time"`);
    await queryRunner.query(
      `CREATE TABLE "stop_time" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sourceId" varchar NOT NULL, "stopSequence" integer NOT NULL, "scheduledTime" integer NOT NULL, "actualTime" integer, "lastUpdatedDataTime" integer, "stopSourceId" varchar, "stopGtfsStopId" varchar, "tripSourceId" varchar, "tripGtfsTripId" varchar, "tripTripDate" varchar)`,
    );
    await queryRunner.query(
      `INSERT INTO "stop_time"("id", "sourceId", "stopSequence", "scheduledTime", "actualTime", "lastUpdatedDataTime", "stopSourceId", "stopGtfsStopId", "tripSourceId", "tripGtfsTripId", "tripTripDate") SELECT "id", "sourceId", "stopSequence", "scheduledTime", "actualTime", "lastUpdatedDataTime", "stopSourceId", "stopGtfsStopId", "tripSourceId", "tripGtfsTripId", "tripTripDate" FROM "temporary_stop_time"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_stop_time"`);
    await queryRunner.query(`CREATE INDEX "IDX_04b97543d717ddf4cfdd22e218" ON "stop_time" ("stopSourceId", "stopGtfsStopId") `);
    await queryRunner.query(`CREATE INDEX "IDX_999f874afb81edd6470fdfe7ef" ON "stop_time" ("tripSourceId", "tripGtfsTripId", "tripTripDate") `);
    await queryRunner.query(`ALTER TABLE "stop" RENAME TO "temporary_stop"`);
    await queryRunner.query(
      `CREATE TABLE "stop" ("sourceId" varchar NOT NULL, "gtfsStopId" varchar NOT NULL, "stopName" varchar NOT NULL DEFAULT (''), "parentSourceId" varchar, "parentGtfsStopId" varchar, PRIMARY KEY ("sourceId", "gtfsStopId"))`,
    );
    await queryRunner.query(
      `INSERT INTO "stop"("sourceId", "gtfsStopId", "stopName", "parentSourceId", "parentGtfsStopId") SELECT "sourceId", "gtfsStopId", "stopName", "parentSourceId", "parentGtfsStopId" FROM "temporary_stop"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_stop"`);
    await queryRunner.query(`DROP INDEX "IDX_758efe4b05b24a9abbc38095ba"`);
    await queryRunner.query(`ALTER TABLE "trip" RENAME TO "temporary_trip"`);
    await queryRunner.query(
      `CREATE TABLE "trip" ("sourceId" varchar NOT NULL, "gtfsTripId" varchar NOT NULL, "tripDate" varchar NOT NULL, "gotLiveData" boolean NOT NULL DEFAULT (0), "isCompletedTrip" boolean NOT NULL DEFAULT (0), "vehicleId" varchar, "routeSourceId" varchar, "routeGtfsRouteId" varchar, PRIMARY KEY ("sourceId", "gtfsTripId", "tripDate"))`,
    );
    await queryRunner.query(
      `INSERT INTO "trip"("sourceId", "gtfsTripId", "tripDate", "gotLiveData", "isCompletedTrip", "vehicleId", "routeSourceId", "routeGtfsRouteId") SELECT "sourceId", "gtfsTripId", "tripDate", "gotLiveData", "isCompletedTrip", "vehicleId", "routeSourceId", "routeGtfsRouteId" FROM "temporary_trip"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_trip"`);
    await queryRunner.query(`CREATE INDEX "IDX_758efe4b05b24a9abbc38095ba" ON "trip" ("routeSourceId", "routeGtfsRouteId") `);
    await queryRunner.query(`DROP INDEX "IDX_04b97543d717ddf4cfdd22e218"`);
    await queryRunner.query(`DROP INDEX "IDX_999f874afb81edd6470fdfe7ef"`);
    await queryRunner.query(`DROP TABLE "stop_time"`);
    await queryRunner.query(`DROP TABLE "stop"`);
    await queryRunner.query(`DROP INDEX "IDX_758efe4b05b24a9abbc38095ba"`);
    await queryRunner.query(`DROP TABLE "trip"`);
    await queryRunner.query(`DROP TABLE "route"`);
    await queryRunner.query(`DROP TABLE "update_time"`);
  }
}
/* eslint-enable */
