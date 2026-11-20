import { getModels } from '../lib/context';

export class CabinetMenuBusiness {
  private static singleton: CabinetMenuBusiness;

  public config: any;

  constructor(config?) {
    if (!CabinetMenuBusiness.singleton) {
      this.config = config;
      CabinetMenuBusiness.singleton = this;
    }

    return CabinetMenuBusiness.singleton;
  }

  async findById(id) {
    return getModels().cabinetMenu.findById(id);
  }

  async getAll(filters) {
    return getModels().cabinetMenu.getAll(filters);
  }

  async create(data) {
    return getModels().cabinetMenu.create(data);
  }

  async update(id, data) {
    return getModels().cabinetMenu.update(id, data);
  }

  async hasChildren(parentId) {
    return getModels().cabinetMenu.hasChildren(parentId);
  }

  async deleteById(id) {
    return getModels().cabinetMenu.deleteById(id);
  }

  async sort(items, transaction) {
    return getModels().cabinetMenu.sort(items, transaction);
  }
}
