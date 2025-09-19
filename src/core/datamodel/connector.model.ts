type UUID = string;

export interface Connector {
  id: UUID;
  station_id: UUID;
  connector_no: number;
  type?: string;
  created_at: string;
}
