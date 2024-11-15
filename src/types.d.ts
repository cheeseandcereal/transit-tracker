export interface ConfigFile {
  database: string;
  datasources: DataSource[];
}

export interface DataSource {
  source_id: string;
  gtfs_schedule: string;
  gtfs_rt_feed: string;
}

export interface ParsedGtfsData {
  // Fields explicitly defined here are required files in the gtfs spec
  // https://gtfs.org/documentation/schedule/reference/#dataset-files
  'agency.txt': CSVRow[];
  'routes.txt': CSVRow[];
  'trips.txt': CSVRow[];
  'stop_times.txt': CSVRow[];
  // stops.txt is not technically required by spec, but it is required for this app, and we will validate it exists
  'stops.txt': CSVRow[];
  [gtfsFileName: string]: CSVRow[] | undefined;
}

export interface CSVRow {
  [columnName: string]: any;
}
