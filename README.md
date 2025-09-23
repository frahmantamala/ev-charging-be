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
3. Run migrations: `pnpm run migration`
4. Start the server: `pnpm start`

## Testing
Add tests for each module in a `__tests__` folder or as `.test.ts` files next to the module. Example test structure:

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

## Contributing
- Keep modules decoupled and event-driven.
- Add/maintain tests for all modules.
- Update documentation for any architectural changes.
