# Transit Tracker

This repository contains a program which can read and save data from a gtfs-rt feed over time, for analysis.

## Configuration

This project requires a configuration file `runtime/config.json` in the working directory of the application.

The schema of this configuration file is as follows:

```javascript
{
  "gtfs_rt_feed": "https://s3.dualstack.us-east-1.amazonaws.com/commtrans-realtime-prod/tripupdates.pb"
}
```
