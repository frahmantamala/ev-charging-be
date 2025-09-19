import { WebSocket } from 'ws';
import { MeterValue } from '../core/datamodel/meter_value.model';

export interface IMeterService {
  createMeterValue(data: Omit<MeterValue, 'created_at'>): Promise<MeterValue>;
  listMeterValuesByTransaction(transactionId: string): Promise<MeterValue[]>;
}

export default function createMeterHandlers(meterService: IMeterService) {
  return {
    async handleMeterValues(payload: any, ws: WebSocket, uniqueId: string) {
      const { transactionId, valueWh, timestamp, phase } = payload;
      if (!transactionId || valueWh == null || !timestamp) {
        const response = [4, uniqueId, 'ProtocolError', 'Missing required fields'];
        ws.send(JSON.stringify(response));
        return;
      }

      await meterService.createMeterValue({
        transaction_id: transactionId,
        value_wh: valueWh,
        time: timestamp,
        phase,
      });

      const response = [3, uniqueId, {}];
      ws.send(JSON.stringify(response));
    }
  };
}
