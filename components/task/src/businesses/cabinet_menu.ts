import { CabinetMenuModel } from '../models/cabinet_menu';

export class CabinetMenuBusiness {
  private static singleton: CabinetMenuBusiness;

  config: any;
  cabinetMenuModel: CabinetMenuModel;

  constructor(config) {
    if (!CabinetMenuBusiness.singleton) {
      this.config = config;
      this.cabinetMenuModel = new CabinetMenuModel();
      CabinetMenuBusiness.singleton = this;
    }

    return CabinetMenuBusiness.singleton;
  }

  async getNavigationTree() {
    return this.cabinetMenuModel.getNavigationTree();
  }
}
