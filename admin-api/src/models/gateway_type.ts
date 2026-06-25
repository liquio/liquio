import Sequelize from 'sequelize';

import { Model } from './model';
import { GatewayTypeEntity } from '../entities/gateway_type';

export class GatewayTypeModel extends Model {
  static singleton: GatewayTypeModel;

  constructor(dbInstance) {
    if (!GatewayTypeModel.singleton) {
      super(dbInstance);

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

      (this.model as any).prototype.prepareEntity = this.prepareEntity;

      GatewayTypeModel.singleton = this;
    }

    return GatewayTypeModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<GatewayTypeEntity[]>}
   */
  async getAll() {
    const gatewayTypes = await this.model.findAll();

    const gatewayTypeEntities = gatewayTypes.map((item) => {
      return this.prepareEntity(item);
    });

    return gatewayTypeEntities;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<GatewayTypeEntity>}
   */
  async findById(id) {
    const gatewayType = await this.model.findByPk(id);

    return this.prepareEntity(gatewayType);
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {GatewayTypeEntity}
   */
  prepareEntity(item) {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    return new GatewayTypeEntity({
      id: item.id,
      name: item.name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {GatewayTypeEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      id: item.id,
      name: item.name,
    };
  }
}
