// Import.
import Controller from './controller';
import FileStorageConnection from '../lib/link_providers/filestorage/filestorage_handler/filestorage_connection';

// Constants.
const MESSAGE_PONG = 'pong';

/**
 * Test controller.
 */
class TestController extends Controller {
  /**
   * Test controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    super(config);

    // Define singleton.
    if (!TestController.singleton) {
      TestController.singleton = this;
    }
    return TestController.singleton;
  }

  /**
   * Ping.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async ping(req, res) {
    const { healthcheck } = req.query;

    // Request to check valid token in header
    if (healthcheck === 'true') {
      const { serversList } = this.config.link_providers.filestorage;

      const { error } = await new FileStorageConnection(serversList[0]).checkValidToken();

      if (error) {
        const { message } = error;

        return this.responseError(res, {
          message: 'Wrong Filestorage provider params.',
          details: {
            filestorageError: message,
          },
        });
      }
    }

    // Prepare response data.
    const processPid = process.pid;
    const responseData = {
      processPid,
      message: MESSAGE_PONG,
    };
    // Response.
    this.responseData(res, responseData);
  }
}

// Export.
export default TestController;
