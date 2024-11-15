# gtfs-realtime-proto

This is a small, largely auto-generated (via [protobuf-cli](https://github.com/protobufjs/protobuf.js/tree/master/cli)) internal package for interacting with the gtfs-realtime protobuf spec.

The gtfs-realtime.proto file in this package is sourced from here: https://github.com/google/transit/blob/master/gtfs-realtime/proto/gtfs-realtime.proto

Any updates should be downloaded from there and copied into this folder.

In order to generate the static code, run `yarn gen-proto` from the parent package.

In order to ensure any changes to this package get included, make sure to `rm -rf node_modules/` then re-run `yarn` to regenerate node_modules, forcing it to re-pull from here after auto-generating new code.
