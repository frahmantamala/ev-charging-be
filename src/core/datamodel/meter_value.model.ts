type UUID = string;

export interface MeterValue {
  time: string; 
  transaction_id: UUID;
  value_wh: number;
  phase?: string;
  created_at: string;
}
