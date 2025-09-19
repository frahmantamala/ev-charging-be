type UUID = string;

export interface StatusNotification {
  time: string;
  connector_id: UUID;
  status: string;
  error_code?: string;
  info?: string;
  created_at: string;
}
