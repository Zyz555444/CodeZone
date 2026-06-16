declare module 'y-websocket/bin/utils' {
  import { WebSocket } from 'ws';
  import { IncomingMessage } from 'http';

  export function setupWSConnection(
    conn: WebSocket,
    req: IncomingMessage,
    options?: { gcEnabled?: boolean }
  ): void;
}

declare module 'y-websocket/bin/server' {
  import http from 'http';
  import { WebSocketServer } from 'ws';

  export class YWeSocketServer extends WebSocketServer {
    constructor(server: http.Server, options?: { gcEnabled?: boolean; gcFilter?: () => boolean });
  }
}

declare module 'yjs' {
  export class Doc {
    constructor();
    getText(name?: string): any;
    getArray<T = any>(name?: string): any;
    getMap<T = any>(name?: string): any;
  }
}
