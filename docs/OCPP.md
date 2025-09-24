# OCPP Implementation Details

This document describes how core OCPP flows are implemented in the app, idempotency guarantees, and error handling.

Supported messages (core flows implemented)

- BootNotification
  - Purpose: station announces itself after rebooting and provides serials, vendor, model and firmware.
  - Implementation: `src/stations/station.ws.ts`
  - Behavior:
    - Validates payload with Zod schema in `src/core/common/validation.ts`.
    - Prefers to find station by `chargePointSerialNumber` (if the service exposes `findBySerial`) to make BootNotification idempotent.
    - If not found, call `StationService.createStation` which will create or upsert station by serial.
    - Responds with Accepted and currentTime interval.

- StartTransaction / StopTransaction
  - Purpose: manage the transactional lifecycle of a charging session.
  - Implementation: `src/transactions/*` and event flow across `event-bus`.
  - Behavior:
    - StartTransaction creates a transaction record, emits `transaction.started` on the event bus, other modules (meter, connector) listen for lifecycle changes.
    - StopTransaction updates transaction state and emits `transaction.stopped`.

- MeterValues
  - Purpose: ingest periodic meter readings for an active transaction.
  - Implementation: `src/meter/*`
  - Behavior:
    - Parses sampled values looking for `Energy.Active.Import.Register` measured in `Wh`, converts to numeric.
    - Validates monotonicity: new meter values must not be lower than the last persisted value, and cannot be lower than the transaction start meter.
    - Writes to `meter_values` hypertable and emits an event for downstream consumers.

- StatusNotification
  - Purpose: station reports connector status (Available, Occupied, Unavailable, Faulted.
  - Implementation: `src/stations/station.ws.ts` -> emits or persists through `stationService.saveStatusNotification`.
  - Behavior:
    - Uses Redis for idempotency: a composite idempotency key like `status:{stationId}:{connectorUuid}:{time}` ensures repeated reports are deduplicated.
    - On first report, the connector lookup may create the connector entity (connector module listens for connector lookup requests).

Idempotency and deduplication

- Redis is used to store short lived idempotency keys for message types where duplicates are likely (StatusNotification, MeterValues with transaction idempotency, BootNotification queueing)
- Station creation is protected at the DB level by a unique index on `charge_point_serial_number`. Repository level createOrUpdateBySerial handles races gracefully: try update, try insert, catch unique-constraint error and re-query.

Validation and error handling

- Payloads are validated with Zod schemas in `src/core/common/validation.ts`.
- OCPP responses follow the OCPP 1.6 and the app maps internal errors to appropriate OCPP error codes where sensible (ProtocolError, TypeConstraintViolation, InternalError).

WebSocket flow

- Incoming messages are parsed by `src/transport/ws.handler.ts`, which dispatches to handlers created in `src/stations/station.ws.ts` and other domain ws files.
- Outgoing responses are sent immediately; when the WebSocket can't send disconnected, a small `connectionManager.queueMessage` helper will queue messages to be delivered when the charge point reconnects.

Security

- No authentication is implemented for the WebSocket layer in this basic implementation. Consider:
  - TLS termination at the load balancer or at the service.
  - Per-device API keys or mutual TLS for charge points.
  - Rate limiting and message throttling.

