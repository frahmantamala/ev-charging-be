import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();
import { DataSource } from "typeorm";
import { MeterValueEntity } from "../meter/meter.entity";
import { TransactionEntity } from "../transactions/transaction.entity";
import { StationEntity } from "../stations/station.entity";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_SOURCE,
  synchronize: false,
  logging: true,
  entities: [StationEntity, TransactionEntity, MeterValueEntity],
  migrations: ["db/migrations/*.ts"],
});
