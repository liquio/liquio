import type { Request, Response } from 'express';
import Controller from './controller';

// Constants.
const MESSAGE_PONG = 'pong';

/**
 * Test controller.
 */
class TestController extends Controller {
  private static singleton: TestController;

  /**
   * Test controller constructor.
   */
  constructor() {
    // Singleton.
    if (!TestController.singleton) {
      // Call parent constructor.
      super();

      // Define singleton.
      TestController.singleton = this;
    }

    // Return singleton.
    return TestController.singleton;
  }

  /**
   * Ping.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async ping(req: Request, res: Response): Promise<void> {
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

export default TestController;
