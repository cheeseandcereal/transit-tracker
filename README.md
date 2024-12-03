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
      "source_id": "ba",
      // a URL to a gtfs spec schedule zip for this provider
      "gtfs_schedule": "https://www.bart.gov/dev/schedules/google_transit.zip",
      // a URL to a gtfs-rt protobuf feed with trip update entities
      "gtfs_rt_feed": "http://api.bart.gov/gtfsrt/tripupdate.aspx",
      // an array of gtfs route IDs to process. Can include "all" to process all routes from this provider
      "routes": ["all"]
    },
    // Another example
    {
      "source_id": "kc",
      "gtfs_schedule": "https://metro.kingcounty.gov/GTFS/google_transit.zip",
      "gtfs_rt_feed": "https://s3.dualstack.us-east-1.amazonaws.com/kcm-alerts-realtime-prod/tripupdates.pb",
      "routes": ["100340", "100512", "102548", "102576", "102581", "102615", "102619", "102736", "102745"]
    }
  ]
}
```

## Running/Development

This project uses nodejs 22+ with typescript and the [yarn](https://classic.yarnpkg.com/) package manager.

After cloning, run `yarn` to install the dependencies.

You can build the project by running `yarn build` and then run the built project by running `node dist/index.js`

Docker can also be used for running. First build the project with the dockerfile, i.e. `docker build . -t ttracker`,
and then you can run it, ensuring to mount the runtime directory (for config/db) with `docker run -v $(pwd)/runtime:/app/runtime ttracker`
