import { ModelStatic, Sequelize, Model as SequelizeModel } from 'sequelize';
export { DataTypes, Sequelize } from 'sequelize';

import { Models, ModelsCollection } from './index';

(SequelizeModel.prototype as any).findCreateUpdate = function (findWhereMap: any, newValuesMap: any) {
  return this.findOrBuild({
    where: findWhereMap,
    defaults: findWhereMap,
  }).spread((newObj: any) => {
    for (let key in newValuesMap) {
      newObj[key] = newValuesMap[key];
    }

    return newObj.save();
  });
};

export abstract class BaseModel<TAttributes extends {}, TCreationAttributes extends {} = TAttributes> {
  protected sequelize: Sequelize;
  public entity!: ModelStatic<SequelizeModel<TAttributes, TCreationAttributes>>;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }

  async init(): Promise<void> {
    // Do nothing by default.
  }

  // Get an entity of a model
  model<K extends keyof ModelsCollection>(model: K): ModelsCollection[K]['entity'] {
    return Models.model(model);
  }
}
