import { DataSource } from 'typeorm';
import { Config } from './configuration.js';

export const DatabaseDataSource = new DataSource({
  type: 'better-sqlite3',
  database: Config.getConfig().database || 'runtime/transittracker.db',
  synchronize: false,
  entities: ['dist/models/**/*.js'],
  migrations: ['dist/migrations/**/*.js'],
  // logging: 'all',
});

export class Database {
  public static datasource: DataSource;

  // Must be called before other methods (on startup)
  public static async initialize() {
    this.datasource = DatabaseDataSource;
    await Database.datasource.initialize();
  }

  public static async shutdown() {
    await Database.datasource.destroy();
  }
}
