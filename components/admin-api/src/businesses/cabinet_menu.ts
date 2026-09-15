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
    return global.models.cabinetMenu.findById(id);
  }

  async getAll(filters) {
    return global.models.cabinetMenu.getAll(filters);
  }

  async create(data) {
    return global.models.cabinetMenu.create(data);
  }

  async update(id, data) {
    return global.models.cabinetMenu.update(id, data);
  }

  async hasChildren(parentId) {
    return global.models.cabinetMenu.hasChildren(parentId);
  }

  async deleteById(id) {
    return global.models.cabinetMenu.deleteById(id);
  }

  async sort(items, transaction) {
    return global.models.cabinetMenu.sort(items, transaction);
  }
}
