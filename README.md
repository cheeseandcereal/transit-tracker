# Transit Tracker

This repository contains a program which can read and save data from a gtfs-rt feed over time, for analysis.

## Configuration

This project requires a configuration file `runtime/config.json` in the working directory of the application.

The schema of this configuration file is as follows:

```javascript
{
  "database": "runtime/transittracker.db", // desired location of the sqlite3 db
  "datasources": [
    // Can have multiple data sources
    {
      // a simple string to uniquely identify this source
      "source_id": "community_transit",
      // a URL to a gtfs spec zip for this provider
      "gtfs_schedule": "https://www.communitytransit.org/docs/default-source/open-data/gtfs/current.zip",
      // a URL to a gtfs-rt feed with trip update entities
      "gtfs_rt_feed": "https://s3.dualstack.us-east-1.amazonaws.com/commtrans-realtime-prod/tripupdates.pb"
    }
  ]
}
```
