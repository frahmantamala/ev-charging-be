import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();
import { DataSource } from "typeorm";
import { StationEntity } from "../stations/station.entity";
import { TransactionEntity } from "../transactions/transaction.entity";
import { MeterValueEntity } from "../meter/meter.entity";
import { ConnectorEntity } from "../connector/connector.entity";
import { StatusNotificationEntity } from "../status_notification/status_notification.entity";
import { IdTagEntity } from "../id_tag/id_tag.entity";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_SOURCE,
  synchronize: false,
  logging: true,
  entities: [StationEntity, TransactionEntity, MeterValueEntity, ConnectorEntity, StatusNotificationEntity, IdTagEntity],
  migrations: ["db/migrations/*.ts"],
});
