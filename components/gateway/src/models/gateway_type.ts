import Sequelize from 'sequelize';

import { Model } from './model';
import { GatewayTypeEntity } from '../entities/gateway_type';

export class GatewayTypeModel extends Model {
  static singleton: GatewayTypeModel;
  model: any;

  constructor() {
    if (!GatewayTypeModel.singleton) {
      super();

      this.model = this.db.define(
        'gatewayType',
        {
          name: { type: Sequelize.ENUM, values: ['parallel', 'exclusive', 'inclusive'] },
        },
        {
          tableName: 'gateway_types',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      GatewayTypeModel.singleton = this;
    }

    return GatewayTypeModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<GatewayTypeEntity>}
   */
  async findById(id: number): Promise<GatewayTypeEntity> {
    const gatewayType = await this.model.findByPk(id);

    return this.prepareEntity(gatewayType);
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {GatewayTypeEntity}
   */
  prepareEntity(item: any): GatewayTypeEntity {
    return new GatewayTypeEntity({
      id: item.id,
      name: item.name,
    });
  }

  /**
   * Prepare for model.
   * @param {GatewayTypeEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item: GatewayTypeEntity): any {
    return {
      name: item.name,
    };
  }
}
