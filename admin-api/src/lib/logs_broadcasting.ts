import { WebSocketServer, WebSocket } from 'ws';
import { AuthController } from '../controllers/auth';

const DEFAULT_PORT = 5000;
const DEFAULT_HEARTBEAT_TIMEOUT = 3000;
const LOGS_BROADCASTING_ADMIN_UNIT = 1000014;

export class LogsBroadcasting {

  public config: any;
  private authController: AuthController;

  constructor(config) {
    this.config = config;
    this.authController = new AuthController(config);
  }

  /**
   * @public
   */
  start() {
    const port = this.config.logs_broadcasting?.port || DEFAULT_PORT;
    const webSocketServer = new WebSocketServer({ port: port });

    // Handle connection.
    webSocketServer.on('connection', (browserSocket, req) => {
      // Check config.
      if (!this.config.logs_broadcasting?.serviceList?.length) {
        browserSocket.send(JSON.stringify({ error: 'Invalid logs_broadcasting config.' }));
        browserSocket.terminate();
        return;
      }

      // Check access.
      const { clientId } = this.config.auth;
      const adminRoles = ['admin', `admin-${clientId}`];

      const token = new URL(req.url, 'http:0.0.0.0').searchParams.get('token');
      req.headers = { ...req.headers, token };

      // Mock response object.
      const res = {
        req: {
          originalUrl: '',
          method: '',
          responseMeta: {},
        },
        status: function () {
          return this;
        },
        send: () => {
          browserSocket.send(JSON.stringify({ error: 'Access denied.' }));
          browserSocket.terminate();
        },
      };
      this.authController.getCheckMiddleware(adminRoles, [LOGS_BROADCASTING_ADMIN_UNIT])(req, res, () => {
        browserSocket.send(JSON.stringify({ info: 'Success connected.' }));

        // Check that connection is alive.
        (browserSocket as any).isAlive = true;
        browserSocket.on('pong', function () {
          (this as any).isAlive = true;
        });

        // Define handlers.
        const sendMessageToBrowserSocket = (message) => browserSocket.send(message.data);
        const handleError = (error) => {
          browserSocket.send(JSON.stringify({ error: error.toString() }));
          browserSocket.terminate();
        };

        // Subscribe to service messages.
        const servicesSockets = [];
        const serviceList = this.config.logs_broadcasting?.serviceList || [];
        for (const service of serviceList) {
          const serviceSocket = new WebSocket(service);
          serviceSocket.on('error', handleError);
          serviceSocket.addEventListener('message', sendMessageToBrowserSocket);
          servicesSockets.push(serviceSocket);
        }

        // Unsubscribe from service messages
        browserSocket.on('close', () => {
          servicesSockets.forEach((serviceSocket) => {
            serviceSocket.removeListener('message', sendMessageToBrowserSocket);
            serviceSocket.removeListener('error', handleError);
            serviceSocket.terminate();
          });
        });
      });
    });

    // Check that connection is alive.
    const heartbeatInterval = setInterval(() => {
      webSocketServer.clients.forEach((browserSocket) => {
        if ((browserSocket as any).isAlive === false) {
          return (browserSocket as any).terminate();
        }
        (browserSocket as any).isAlive = false;
        browserSocket.ping();
      });
    }, DEFAULT_HEARTBEAT_TIMEOUT);
    webSocketServer.on('close', () => clearInterval(heartbeatInterval));

    global.log.save('logs-broadcasting-started', { port: port });
  }
}
