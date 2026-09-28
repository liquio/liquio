import { Express, Router } from '../types';
import { AuthController } from './auth.controller';
import { EdsController } from './eds.controller';
import { LoginHistoryController } from './login_history.controller';
import { SignUpController } from './sign_up.controller';
import { StatController } from './stat.controller';
import { TestController } from './test.controller';
import { TotpController } from './totp.controller';
import { UserController } from './user.controller';
import { UserAdminActionController } from './user_admin_action.controller';

export interface ControllersCollection {
  auth: AuthController;
  totp: TotpController;
  user: UserController;
  eds: EdsController;
  loginHistory: LoginHistoryController;
  userAdminAction: UserAdminActionController;
  test: TestController;
  stat: StatController;
  signUp: SignUpController;
}

export class Controllers {
  private readonly controllerMap: ControllersCollection;

  constructor(readonly express: Express) {
    const router = Router();

    this.controllerMap = {
      auth: new AuthController(router, express),
      totp: new TotpController(router, express),
      user: new UserController(router, express),
      eds: new EdsController(router, express),
      loginHistory: new LoginHistoryController(router, express),
      userAdminAction: new UserAdminActionController(router, express),
      test: new TestController(router, express),
      stat: new StatController(router, express),
      signUp: new SignUpController(router, express),
    };

    // For each controller, register the routes with the router.
    for (const controller of Object.values(this.controllerMap)) {
      controller.registerRoutes();
    }

    express.use('/', router);
  }

  getController<T extends keyof ControllersCollection>(name: T): ControllersCollection[T] {
    return this.controllerMap[name];
  }
}
