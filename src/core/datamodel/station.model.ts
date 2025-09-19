type UUID = string;

export interface Station {
  id: UUID;
  name: string;
  location?: string;
  firmware?: string;
  created_at: string;
  updated_at: string;
}
