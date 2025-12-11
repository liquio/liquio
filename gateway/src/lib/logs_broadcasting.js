const { WebSocketServer } = require('ws');
const { PassThrough } = require('stream');

const DEFAULT_PORT = 5000;
const DEFAULT_HEARTBEAT_TIMEOUT = 30000;

class LogsBroadcasting {
  constructor() {}

  /**
   * @public
   * @static
   * @param {Object} config
   */
  static start(config) {
    const port = config?.port || DEFAULT_PORT;
    const webSocketServer = new WebSocketServer({ port: port });

    // Pipe stdout to socket.
    const stdOutStream = new PassThrough();
    process.stdout.__write = process.stdout.write;
    process.stdout.write = (data) => {
      stdOutStream.write(data);
      process.stdout.__write(data);
    };

    // Pipe stderr to socket.
    const stdErrorStream = new PassThrough();
    process.stderr.__write = process.stderr.write;
    process.stderr.write = (data) => {
      stdErrorStream.write(data);
      process.stderr.__write(data);
    };

    // Handle connection.
    webSocketServer.on('connection', (socket) => {
      // Check that connection alive.
      socket.isAlive = true;
      socket.on('pong', function () {
        this.isAlive = true;
      });

      // Define handlers.
      const sendInfoLog = (data) => socket.send(JSON.stringify({ info: data.toString('utf-8') }));
      const sendErrorLog = (data) => socket.send(JSON.stringify({ error: data.toString('utf-8') }));

      // Subscribe to stdout and stderr.
      stdOutStream.on('data', sendInfoLog);
      stdErrorStream.on('data', sendErrorLog);

      // Unsubscribe from stdout and stderr.
      socket.on('close', () => {
        stdOutStream.removeListener('data', sendInfoLog);
        stdErrorStream.removeListener('data', sendErrorLog);
      });
    });

    // Check that connection alive.
    const heartbeatInterval = setInterval(() => {
      webSocketServer.clients.forEach((socket) => {
        if (socket.isAlive === false) {
          return socket.terminate();
        }
        socket.isAlive = false;
        socket.ping();
      });
    }, DEFAULT_HEARTBEAT_TIMEOUT);
    webSocketServer.on('close', () => clearInterval(heartbeatInterval));

    log.save('logs-broadcasting-started', { port: port });
  }
}

module.exports = LogsBroadcasting;
