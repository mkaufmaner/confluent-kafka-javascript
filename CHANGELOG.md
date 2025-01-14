# confluent-kafka-javascript v0.1.12-devel

v0.1.12-devel is a pre-production, early-access release.

## Features

1. Add support for `listTopics` in the Admin API.
2. Add support for OAUTHBEARER token refresh callback for both promisified and non promisified API.

## Bug Fixes

1. Fix aliasing bug between `NodeKafka::Conf` and `RdKafka::ConfImpl`.
2. Fix issue where `assign/unassign` were called instead of `incrementalAssign/incrementalUnassign` while using
   the Cooperative Sticky assigner, and setting the `rebalance_cb` as a boolean rather than as a function.
3. Fix memory leaks in Dispatcher and Conf (both leaked memory at client close).
4. Fix type definitions and make `KafkaJS` and `RdKafka` separate namespaces, while maintaining compatibility
   with node-rdkafka's type definitions.


# confluent-kafka-javascript v0.1.11-devel

v0.1.11-devel is a pre-production, early-access release.

## Features

1. Add support for `eachBatch` in the Consumer API (partial support for API compatibility).
2. Add support for `listGroups`, `describeGroups` and `deleteGroups` in the Admin API.


# confluent-kafka-javascript v0.1.10-devel

v0.1.10-devel is a pre-production, early-access release.

## Features

1. Pre-built binaries for Windows (x64) added on an experimental basis.


# confluent-kafka-javascript v0.1.9-devel

v0.1.9-devel is a pre-production, early-access release.

## Features

1. Pre-built binaries for Linux (both amd64 and arm64, both musl and glibc), for macOS (m1), for node versions 18, 20 and 21.
2. Promisified API for Consumer, Producer and Admin Client.
3. Allow passing topic configuration properties via the global configuration block.
4. Remove dependencies with security issues.
5. Support for the Cooperative Sticky assignor.
