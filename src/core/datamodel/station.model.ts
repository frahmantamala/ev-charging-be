type UUID = string;

export interface Station {
  id: UUID;
  name: string;
  location?: string;
  firmware?: string;
  vendor?: string;
  model?: string;
  charge_point_serial_number: string;
  charge_box_serial_number: string;
  iccid?: string;
  imsi?: string;
  meter_type?: string;
  meter_serial_number?: string;
  created_at: string;
  updated_at: string;
}
