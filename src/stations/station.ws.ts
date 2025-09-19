import { WebSocket } from 'ws';
import { Station } from '../core/datamodel/station.model';

export interface IStationService {
  createStation(data: Omit<Station, 'id' | 'created_at' | 'updated_at'>): Promise<Station>;
  getStationById(id: string): Promise<Station | null>;
  getStationByName(name: string): Promise<Station | null>;
  updateStation(id: string, update: Partial<Omit<Station, 'id' | 'created_at' | 'updated_at'>>): Promise<Station>;
  listStations(): Promise<Station[]>;
}

export default function createStationHandlers(stationService: IStationService) {
  return {
    async handleBootNotification(payload: any, ws: WebSocket, uniqueId: string) {
      // Validate payload (add real validation as needed)
      const { stationName, location, firmware } = payload;
      if (!stationName) {
        const response = [4, uniqueId, 'ProtocolError', 'Missing stationName'];
        ws.send(JSON.stringify(response));
        return;
      }
      // Register or update station
      let station = await stationService.getStationByName(stationName);
      if (!station) {
        station = await stationService.createStation({ name: stationName, location, firmware });
      }
      const response = [3, uniqueId, {
        currentTime: new Date().toISOString(),
        interval: 60,
        status: 'Accepted'
      }];
      ws.send(JSON.stringify(response));
    }
  };
}
