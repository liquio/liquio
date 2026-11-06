import { Controller } from './controller';
import { CabinetMenuBusiness } from '../businesses/cabinet_menu';

export class CabinetMenuController extends Controller {
  private static singleton: CabinetMenuController;

  business: CabinetMenuBusiness;

  constructor(config) {
    if (!CabinetMenuController.singleton) {
      super(config);
      this.business = new CabinetMenuBusiness(config);
      CabinetMenuController.singleton = this;
    }

    return CabinetMenuController.singleton;
  }

  async getNavigationTree(req, res) {
    try {
      const tree = await this.business.getNavigationTree();
      this.responseData(res, tree);
    } catch (error) {
      return this.responseError(res, error);
    }
  }
}
