#!/bin/sh
set -e

# Wait for DB to be ready (pg_isready)
if command -v pg_isready >/dev/null 2>&1; then
  echo "Waiting for Postgres to be ready..."
  until pg_isready -h "$(echo $DATABASE_SOURCE | sed -n 's#.*@\([^:]*\):.*#\1#p')" -p $(echo $DATABASE_SOURCE | sed -n 's#.*:\([0-9]*\)/.*#\1#p') >/dev/null 2>&1; do
    echo "."
    sleep 1
  done
fi

# Run migrations
if [ "$NODE_ENV" != "test" ]; then
  echo "Running migrations..."
  pnpm run migrate:run || true
fi

# Exec the CMD
exec "$@"
