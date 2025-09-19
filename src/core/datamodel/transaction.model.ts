type UUID = string;

export type TransactionStatus = 'active' | 'stopped' | 'error';

export interface Transaction {
  id: UUID;
  connector_id: UUID;
  start_time: string;
  stop_time?: string;
  start_meter: number;
  stop_meter?: number;
  status: TransactionStatus;
  created_at: string;
}
