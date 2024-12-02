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
      "source_id": "ct",
      // a URL to a gtfs spec zip for this provider
      "gtfs_schedule": "https://www.communitytransit.org/docs/default-source/open-data/gtfs/current.zip",
      // a URL to a gtfs-rt feed with trip update entities
      "gtfs_rt_feed": "https://s3.dualstack.us-east-1.amazonaws.com/commtrans-realtime-prod/tripupdates.pb",
      // an array of gtfs route IDs to process. Can include "all" to process all routes from this provider
      "routes": ["201"]
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
