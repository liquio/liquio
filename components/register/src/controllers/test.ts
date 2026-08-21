import { Request, Response } from '../router';
import Controller from './controller';

// Constants.
const MESSAGE_PONG = 'pong';

/**
 * Test controller.
 */
export default class TestController extends Controller {
  static singleton: TestController;

  /**
   * Test controller constructor.
   */
  constructor(config: any) {
    // Define singleton.
    if (!TestController.singleton) {
      super(config);
      TestController.singleton = this;
    }
    return TestController.singleton;
  }

  /**
   * Ping.
   */
  ping(req: Request, res: Response) {
    // Prepare response data.
    const processPid = process.pid;
    const responseData = {
      processPid,
      message: MESSAGE_PONG
    };

    // Response.
    this.responseData(res, responseData);
  }
}
