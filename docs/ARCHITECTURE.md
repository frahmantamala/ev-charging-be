# Architecture Overview

This document summarizes the high-level architecture of the EV Charging App and the responsibilities of each component.

## High-level shape

- Monolithic Node.js application written in TypeScript.
- Domain modules for station, connector, id_tag, transaction, meter, and status_notification.
- Central, in-process event bus implemented with RxJS Subject for cross-module coordination.
- WebSocket-based transport using `ws` to receive OCPP messages from charge points.
- Persistent storage in PostgreSQL (TimescaleDB extension used for time-series hypertables), and Redis for caching and idempotency.

## Components

- API / Transport
  - `src/transport/ws.server.ts` and `src/transport/ws.handler.ts` handle WebSocket connections and map messages to domain handlers.
  - `src/stations/station.ws.ts` holds OCPP station-related WebSocket handlers (BootNotification, StatusNotification, etc.).

- Domain modules
  - `src/stations/` — station creation, lookup, and domain business logic.
  - `src/connector/` — connector mapping and resource ownership.
  - `src/transactions/` — start/stop transaction lifecycle and events.
  - `src/meter/` — meter value parsing, validation and persistence.
  - `src/id_tag/` — id_tag (RFID) management and authorization.
  - `src/status_notification/` — persist and emit connector status changes.

- Event bus
  - `src/core/events/event-bus.ts` — a small RxJS Subject used by modules to emit domain events and react to them.
  - Used for connector lookup, transaction lifecycle events, and decoupling write operations (for example: connector creation triggered by a StatusNotification can be handled by a connector module consumer).

- Persistence
  - TypeORM is used for entities and migrations (db/migrations).
  - TimescaleDB hypertables are used for high-volume time-series data: `meter_values` and `status_notifications`.
  - Redis is used for short-lived caches and idempotency (prevent duplicate processing of repeated OCPP messages).

## Deployment and scaling

- The app is designed as a modular monolith. For scaling you can:
  - Run multiple app instances behind a load balancer for WebSocket termination.
  - Use a shared Postgres and Redis cluster.
  - For very high ingest of meter data, rely on TimescaleDB hypertables and tune partitions.

## Observability

- Logs are written with a JSON logger; add a log shipper or file sink as appropriate.
- Metrics and traces are not currently wired; consider adding Prometheus metrics and OpenTelemetry.

## Notes and trade-offs

- Event bus is in-process, which makes communication fast but requires co-located modules. For cross-process scaling it can replace the event bus with a message broker (Redis streams, Kafka, or RabbitMQ).
