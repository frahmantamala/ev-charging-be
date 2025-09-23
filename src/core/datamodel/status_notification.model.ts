type UUID = string;

export interface StatusNotification {
  time: string;
  station_id?: UUID;
  connector_id: number;
  status: string;
  error_code?: string;
  info?: string;
  created_at: string;
}
