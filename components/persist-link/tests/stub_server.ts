// Import.
import http from 'node:http';
import { AddressInfo } from 'node:net';

export type StubHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

/**
 * Local HTTP stub standing in for a downstream service (listens on an ephemeral port).
 */
export class StubServer {
  private server: http.Server;
  public requests: { method?: string; url?: string; headers: http.IncomingHttpHeaders }[] = [];

  constructor(private handler: StubHandler) {
    this.server = http.createServer((req, res) => {
      this.requests.push({ method: req.method, url: req.url, headers: req.headers });
      this.handler(req, res);
    });
  }

  async start(): Promise<string> {
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  async stop() {
    this.server.closeAllConnections?.();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}
