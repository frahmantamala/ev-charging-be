import { Transaction } from '../core/datamodel/transaction.model';
import { emitTransactionStarted, emitTransactionStopped } from './transaction.events';
import { emitAndWait } from '../core/events/event-bus';
import logger from '../core/logger';

export interface ITransactionRepository {
  create(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction>;
  findById(id: string): Promise<Transaction | null>;
  findActiveByConnector(connectorId: string): Promise<Transaction | null>;
  updateStatus(id: string, status: Transaction['status'], stopTime?: string, stopMeter?: number): Promise<void>;
  listByConnector(connectorId: string): Promise<Transaction[]>;
}

export class TransactionService {
  constructor(private readonly repo: ITransactionRepository) {}

  async createTransaction(data: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
    const active = await this.repo.findActiveByConnector(data.connector_id);
    if (active) {
      throw new Error('There is already an active transaction for this connector');
    }

    if (data.start_meter < 0) {
      throw new Error('Start meter value must be >= 0');
    }
    const transaction = await this.repo.create(data);
    emitTransactionStarted({ transaction });
    return transaction;
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    return this.repo.findById(id);
  }

  async getActiveTransactionByConnector(connectorId: string): Promise<Transaction | null> {
    return this.repo.findActiveByConnector(connectorId);
  }

  async updateTransactionStatus(id: string, status: Transaction['status'], stopTime?: string, stopMeter?: number): Promise<void> {
    const transaction = await this.repo.findById(id);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (status === 'stopped' && transaction.status !== 'active') {
      throw new Error('Only active transactions can be stopped');
    }
    
    if (status === 'stopped' && stopMeter != null && stopMeter < transaction.start_meter) {
      throw new Error('Stop meter value must be >= start meter value');
    }
    await this.repo.updateStatus(id, status, stopTime, stopMeter);
    const updated = await this.repo.findById(id);
    if (updated && status === 'stopped') {
      emitTransactionStopped({ transaction: updated });
    }
  }

  async listTransactionsByConnector(connectorId: string): Promise<Transaction[]> {
    return this.repo.listByConnector(connectorId);
  }

  async startTransactionWithDependencies(
    params: {
      connectorId: number;
      idTag: string;
      meterStart: number;
      timestamp: string;
      stationId?: string;
    },
    deps: {
      idTagService: any;
      connectorService: any;
      redis?: any;
    }
  ) {
    const { connectorId, idTag, meterStart, timestamp, stationId } = params;
  const { idTagService, connectorService, redis } = deps;

  let idTagInfo: any = null;
    try {
      if (redis) {
        const cached = await redis.get(`idtag:status:${idTag}`);
        if (cached) {
          idTagInfo = JSON.parse(cached);
        }
      }
      if (!idTagInfo || !idTagInfo.status) {
        try {
          const res = await emitAndWait<{ idTag: string; requestId?: string }, any>({
            requestType: 'idtag.authorize.requested',
            requestPayload: { idTag },
            responseType: 'idtag.authorize.resolved',
            timeoutMs: 2000,
          });
          if (res && (res as any).status) {
            idTagInfo = { status: (res as any).status } as any;
            if ((res as any).expiryDate) idTagInfo.expiryDate = (res as any).expiryDate;
            if ((res as any).parentIdTag) idTagInfo.parentIdTag = (res as any).parentIdTag;
          }
        } catch (e) {
          logger.error({ err: e }, 'Failed to authorize ID tag via event bus');
        }

        if ((!idTagInfo || !idTagInfo.status) && idTagService) {
          const result = await idTagService.authorize(idTag);
          idTagInfo = { status: result.status } as any;
          if ((result as any).expiryDate) idTagInfo.expiryDate = (result as any).expiryDate;
          if ((result as any).parentIdTag) idTagInfo.parentIdTag = (result as any).parentIdTag;
        }

        if (redis && idTagInfo && idTagInfo.status) {
          if (idTagInfo.status !== 'Accepted') {
            await redis.set(`idtag:status:${idTag}`, JSON.stringify(idTagInfo), 'EX', 60);
          } else {
            await redis.set(`idtag:status:${idTag}`, JSON.stringify(idTagInfo), 'EX', 3600);
          }
        }
      }
    } catch (err) {
      logger.error({ err }, 'Failed to authorize ID tag');
    }

    if (idTagInfo.status !== 'Accepted') {
      const err: any = new Error('RFID tag not authorized or expired');
      err.code = 'IDTAG_NOT_AUTHORIZED';
      throw err;
    }

    let connectorUuid: string | null = null;
    try {
      try {
        const res = await emitAndWait<{ stationId: string; connectorNo: number; requestId?: string }, any>({
          requestType: 'connector.lookup.requested',
          requestPayload: { stationId: stationId || '', connectorNo: connectorId },
          responseType: 'connector.lookup.resolved',
          timeoutMs: 2000,
        });
        if (res && (res as any).connectorUuid) connectorUuid = (res as any).connectorUuid;
      } catch (e) {
        logger.error({ err: e }, 'Failed to lookup connector via event bus');
      }

      if (!connectorUuid && connectorService) {
        connectorUuid = await connectorService.findOrCreateConnector(stationId || '', connectorId);
      }
    } catch (err) {
      const e: any = new Error('Connector lookup failed');
      e.cause = err;
      throw e;
    }
    if (!connectorUuid) {
      throw new Error('Connector not found or created');
    }

    // create transaction
    const transaction = await this.createTransaction({
      connector_id: connectorUuid,
      start_time: timestamp,
      start_meter: meterStart,
      status: 'active',
    });

    return { transaction, idTagInfo };
  }
}
