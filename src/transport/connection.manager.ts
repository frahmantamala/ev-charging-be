import { WebSocket } from 'ws';

export type StationConnectionState = {
  stationId: string;
  ws: WebSocket | null;
  status: 'connected' | 'disconnected';
  lastSeen: Date;
  messageQueue: string[];
};

export class ConnectionManager {
  private connections: Map<string, StationConnectionState> = new Map();

  addConnection(stationId: string, ws: WebSocket) {
    const now = new Date();
    const existing = this.connections.get(stationId);
    if (existing) {
      existing.ws = ws;
      existing.status = 'connected';
      existing.lastSeen = now;
      this.flushQueue(stationId);
    } else {
      this.connections.set(stationId, {
        stationId,
        ws,
        status: 'connected',
        lastSeen: now,
        messageQueue: [],
      });
    }
  }

  removeConnection(stationId: string) {
    const conn = this.connections.get(stationId);
    if (conn) {
      conn.status = 'disconnected';
      conn.ws = null;
      conn.lastSeen = new Date();
    }
  }

  queueMessage(stationId: string, message: string) {
    const conn = this.connections.get(stationId);
    if (conn) {
      conn.messageQueue.push(message);
    }
  }

  flushQueue(stationId: string) {
    const conn = this.connections.get(stationId);
    if (conn && conn.ws && conn.status === 'connected') {
      while (conn.messageQueue.length > 0) {
        const msg = conn.messageQueue.shift();
        if (msg) conn.ws.send(msg);
      }
    }
  }

  getConnection(stationId: string): StationConnectionState | undefined {
    return this.connections.get(stationId);
  }

  getAllConnections() {
    return Array.from(this.connections.values());
  }

  closeAllConnections() {
    for (const conn of this.connections.values()) {
      if (conn.ws) {
        conn.ws.close();
      }
      conn.status = 'disconnected';
      conn.ws = null;
    }
  }
}

export const connectionManager = new ConnectionManager();
