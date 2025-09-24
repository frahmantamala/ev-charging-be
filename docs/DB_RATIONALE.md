# DB notes

This is just a short note about the database choices I made.

Why Postgres + Timescale

- Postgres for the usual reasons: reliable, ACID, easy with TypeORM.
- Timescale is used only for time series (meter readings, status notifications). It helps with partitioning and later analytics.

What I did in migrations

- I create `meter_values` and `status_notifications` as hypertables.
- I guard Timescale extension calls so migrations don't fail on plain Postgres.
- Timescale can create default indexes that sometimes conflict with our PKs. To avoid surprises I disable default indexes and create the indexes we need explicitly.

Indexes and keys

- `meter_values`: indexed on `(transaction_id, time DESC)` to read recent samples quickly.
- `status_notifications`: indexed on `(connector_id, time DESC)` for latest status per connector.
- Stations also have a unique index on `charge_point_serial_number` (created in a migration). The repo code uses a safe upsert-by-serial to avoid race conditions.

If something breaks

- Check the Timescale extension version in the DB and pin the image in `docker-compose.yml` if needed.
- Inspect hypertables:

```sql
SELECT * FROM timescaledb_information.hypertables;
```

- If migrations fail with an index/time error, either make the PK include `time` or keep `create_default_indexes => FALSE` and manage indexes explicitly.

Diagram

- `docs/ev_db_diagram.svg`.
