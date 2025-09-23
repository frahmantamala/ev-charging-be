# EV Charging App Backend

## Overview
This project is a modular, event-driven OCPP backend for EV charging stations. It is built with TypeScript, Node.js, PostgreSQL, TypeORM, ws, Redis, and RxJS.

## Architecture
- **Modular Monolith**: Each domain (station, connector, id_tag, status_notification, transaction, meter) is separated into its own module.
- **Event-Driven**: All cross-module communication uses a central event bus (RxJS Subject).
- **Persistence**: PostgreSQL via TypeORM for relational data, Redis for caching and idempotency.

## Modules
- `src/stations/`: Station domain logic
- `src/connector/`: Connector domain logic
- `src/id_tag/`: IdTag (RFID) domain logic
- `src/status_notification/`: Status notification domain logic
- `src/transactions/`: Transaction domain logic
- `src/meter/`: Meter value domain logic
- `src/core/events/`: Central event bus

## Event Bus
All modules emit and listen for events using the event bus in `src/core/events/event-bus.ts`.

## Running the App
1. Install dependencies: `pnpm install`
2. Configure your database and Redis in `.env`
3. Run migrations:
  - The repo includes a lightweight migration helper: `pnpm run migration`
  - Alternatively you can run the TypeORM migrator: `pnpm run migrate:run`
4. Start the server: `pnpm run:server`

Before starting the server make sure:
- PostgreSQL is running and reachable using `DATABASE_SOURCE` in your `.env`.
- Redis is running and reachable using `REDIS_URL` in your `.env`.

## Testing
There are currently no runnable test scripts configured in `package.json` (the `test` script is a placeholder). If you add tests you can run them with Jest; suggested steps:

- Install dev deps (Jest + ts-jest are already listed as devDependencies).
- Add a `test` script in `package.json`, for example: `"test": "jest --config jest.config.js"`.
- Place unit tests next to modules or under `__tests__` as you prefer.

Example structure:

```
src/
  stations/
    __tests__/
      station.service.test.ts
  connector/
    __tests__/
      connector.repository.test.ts
  ...
```
