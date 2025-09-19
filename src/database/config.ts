import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_SOURCE,
  synchronize: false,
  logging: true,
  entities: ["src/**/*.entity.ts"],
  migrations: ["db/migrations/*.ts"],
});
