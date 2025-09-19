#!/usr/bin/env node
import { execSync } from "node:child_process";

const name = process.argv[2];
if (!name) {
  console.error("Usage: pnpm migration <MigrationName>");
  process.exit(1);
}

execSync(
  `pnpm typeorm migration:create db/migrations/${name}`,
  { stdio: "inherit" }
);
