import http from 'http';
import { setupWebSocketServer } from './ws.handler';
import { connectionManager } from './connection.manager';
import createStationHandlers, { IStationService } from '../stations/station.ws';
import createTransactionHandlers, { ITransactionService } from '../transactions/transaction.ws';
import createMeterHandlers, { IMeterService } from '../meter/meter.ws';
import { StationService } from '../stations/station.service';
import { TransactionService } from '../transactions/transaction.service';
import { MeterService } from '../meter/meter.service';
import { TypeOrmStationRepository } from '../stations/station.repository';
import { TypeOrmTransactionRepository } from '../transactions/transaction.repository';
import { TypeOrmMeterRepository } from '../meter/meter.repository';
import { AppDataSource } from '../database/config';
import { StationEntity } from '../stations/station.entity';
import { TransactionEntity } from '../transactions/transaction.entity';
import { MeterValueEntity } from '../meter/meter.entity';

const server = http.createServer();
const PORT = process.env.PORT || 3000;

async function startServer() {
  await AppDataSource.initialize();

  const stationRepo = new TypeOrmStationRepository(AppDataSource.getRepository(StationEntity));
  const transactionRepo = new TypeOrmTransactionRepository(AppDataSource.getRepository(TransactionEntity));
  const meterRepo = new TypeOrmMeterRepository(AppDataSource.getRepository(MeterValueEntity));

  const stationService: IStationService = new StationService(stationRepo);
  const transactionService: ITransactionService = new TransactionService(transactionRepo);
  const meterService: IMeterService = new MeterService(meterRepo);

  setupWebSocketServer(server, {
    stationService,
    transactionService,
    meterService,
  });

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });

  // graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down server...');
    connectionManager.closeAllConnections();
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    // fallback: force exit after 5s
    setTimeout(() => process.exit(1), 5000);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
