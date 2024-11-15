import { MigrationInterface, QueryRunner } from 'typeorm';

export class Base1000000000000 implements MigrationInterface {
  name = 'Base1000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "route" ("sourceId" varchar NOT NULL, "gtfsRouteId" varchar NOT NULL, "routeName" varchar NOT NULL, "routeLongName" varchar NOT NULL, PRIMARY KEY ("sourceId", "gtfsRouteId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "trip" ("sourceId" varchar NOT NULL, "gtfsTripId" varchar NOT NULL, "date" date NOT NULL, "gotLiveData" boolean NOT NULL DEFAULT (0), "isCompletedTrip" boolean NOT NULL DEFAULT (0), "routeSourceId" varchar, "routeGtfsRouteId" varchar, PRIMARY KEY ("sourceId", "gtfsTripId", "date"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "stop" ("sourceId" varchar NOT NULL, "gtfsStopId" varchar NOT NULL, "stopName" varchar, "parentSourceId" varchar, "parentGtfsStopId" varchar, PRIMARY KEY ("sourceId", "gtfsStopId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "stop_time" ("id" varchar PRIMARY KEY NOT NULL, "sourceId" varchar NOT NULL, "scheduledTime" datetime NOT NULL, "actualTime" datetime, "lastUpdated" datetime NOT NULL DEFAULT (datetime('now')), "tripSourceId" varchar, "tripGtfsTripId" varchar, "tripDate" date, "stopSourceId" varchar, "stopGtfsStopId" varchar)`,
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_trip" ("sourceId" varchar NOT NULL, "gtfsTripId" varchar NOT NULL, "date" date NOT NULL, "gotLiveData" boolean NOT NULL DEFAULT (0), "isCompletedTrip" boolean NOT NULL DEFAULT (0), "routeSourceId" varchar, "routeGtfsRouteId" varchar, CONSTRAINT "FK_758efe4b05b24a9abbc38095ba9" FOREIGN KEY ("routeSourceId", "routeGtfsRouteId") REFERENCES "route" ("sourceId", "gtfsRouteId") ON DELETE NO ACTION ON UPDATE NO ACTION, PRIMARY KEY ("sourceId", "gtfsTripId", "date"))`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_trip"("sourceId", "gtfsTripId", "date", "gotLiveData", "isCompletedTrip", "routeSourceId", "routeGtfsRouteId") SELECT "sourceId", "gtfsTripId", "date", "gotLiveData", "isCompletedTrip", "routeSourceId", "routeGtfsRouteId" FROM "trip"`,
    );
    await queryRunner.query(`DROP TABLE "trip"`);
    await queryRunner.query(`ALTER TABLE "temporary_trip" RENAME TO "trip"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_stop" ("sourceId" varchar NOT NULL, "gtfsStopId" varchar NOT NULL, "stopName" varchar, "parentSourceId" varchar, "parentGtfsStopId" varchar, CONSTRAINT "FK_36077f05f3f4406b593302908ed" FOREIGN KEY ("parentSourceId", "parentGtfsStopId") REFERENCES "stop" ("sourceId", "gtfsStopId") ON DELETE NO ACTION ON UPDATE NO ACTION, PRIMARY KEY ("sourceId", "gtfsStopId"))`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_stop"("sourceId", "gtfsStopId", "stopName", "parentSourceId", "parentGtfsStopId") SELECT "sourceId", "gtfsStopId", "stopName", "parentSourceId", "parentGtfsStopId" FROM "stop"`,
    );
    await queryRunner.query(`DROP TABLE "stop"`);
    await queryRunner.query(`ALTER TABLE "temporary_stop" RENAME TO "stop"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_stop_time" ("id" varchar PRIMARY KEY NOT NULL, "sourceId" varchar NOT NULL, "scheduledTime" datetime NOT NULL, "actualTime" datetime, "lastUpdated" datetime NOT NULL DEFAULT (datetime('now')), "tripSourceId" varchar, "tripGtfsTripId" varchar, "tripDate" date, "stopSourceId" varchar, "stopGtfsStopId" varchar, CONSTRAINT "FK_3e33e3149361520bb9d9c4cfdae" FOREIGN KEY ("tripSourceId", "tripGtfsTripId", "tripDate") REFERENCES "trip" ("sourceId", "gtfsTripId", "date") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_04b97543d717ddf4cfdd22e2184" FOREIGN KEY ("stopSourceId", "stopGtfsStopId") REFERENCES "stop" ("sourceId", "gtfsStopId") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_stop_time"("id", "sourceId", "scheduledTime", "actualTime", "lastUpdated", "tripSourceId", "tripGtfsTripId", "tripDate", "stopSourceId", "stopGtfsStopId") SELECT "id", "sourceId", "scheduledTime", "actualTime", "lastUpdated", "tripSourceId", "tripGtfsTripId", "tripDate", "stopSourceId", "stopGtfsStopId" FROM "stop_time"`,
    );
    await queryRunner.query(`DROP TABLE "stop_time"`);
    await queryRunner.query(`ALTER TABLE "temporary_stop_time" RENAME TO "stop_time"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stop_time" RENAME TO "temporary_stop_time"`);
    await queryRunner.query(
      `CREATE TABLE "stop_time" ("id" varchar PRIMARY KEY NOT NULL, "sourceId" varchar NOT NULL, "scheduledTime" datetime NOT NULL, "actualTime" datetime, "lastUpdated" datetime NOT NULL DEFAULT (datetime('now')), "tripSourceId" varchar, "tripGtfsTripId" varchar, "tripDate" date, "stopSourceId" varchar, "stopGtfsStopId" varchar)`,
    );
    await queryRunner.query(
      `INSERT INTO "stop_time"("id", "sourceId", "scheduledTime", "actualTime", "lastUpdated", "tripSourceId", "tripGtfsTripId", "tripDate", "stopSourceId", "stopGtfsStopId") SELECT "id", "sourceId", "scheduledTime", "actualTime", "lastUpdated", "tripSourceId", "tripGtfsTripId", "tripDate", "stopSourceId", "stopGtfsStopId" FROM "temporary_stop_time"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_stop_time"`);
    await queryRunner.query(`ALTER TABLE "stop" RENAME TO "temporary_stop"`);
    await queryRunner.query(
      `CREATE TABLE "stop" ("sourceId" varchar NOT NULL, "gtfsStopId" varchar NOT NULL, "stopName" varchar, "parentSourceId" varchar, "parentGtfsStopId" varchar, PRIMARY KEY ("sourceId", "gtfsStopId"))`,
    );
    await queryRunner.query(
      `INSERT INTO "stop"("sourceId", "gtfsStopId", "stopName", "parentSourceId", "parentGtfsStopId") SELECT "sourceId", "gtfsStopId", "stopName", "parentSourceId", "parentGtfsStopId" FROM "temporary_stop"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_stop"`);
    await queryRunner.query(`ALTER TABLE "trip" RENAME TO "temporary_trip"`);
    await queryRunner.query(
      `CREATE TABLE "trip" ("sourceId" varchar NOT NULL, "gtfsTripId" varchar NOT NULL, "date" date NOT NULL, "gotLiveData" boolean NOT NULL DEFAULT (0), "isCompletedTrip" boolean NOT NULL DEFAULT (0), "routeSourceId" varchar, "routeGtfsRouteId" varchar, PRIMARY KEY ("sourceId", "gtfsTripId", "date"))`,
    );
    await queryRunner.query(
      `INSERT INTO "trip"("sourceId", "gtfsTripId", "date", "gotLiveData", "isCompletedTrip", "routeSourceId", "routeGtfsRouteId") SELECT "sourceId", "gtfsTripId", "date", "gotLiveData", "isCompletedTrip", "routeSourceId", "routeGtfsRouteId" FROM "temporary_trip"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_trip"`);
    await queryRunner.query(`DROP TABLE "stop_time"`);
    await queryRunner.query(`DROP TABLE "stop"`);
    await queryRunner.query(`DROP TABLE "trip"`);
    await queryRunner.query(`DROP TABLE "route"`);
  }
}
