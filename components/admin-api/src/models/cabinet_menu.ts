import Sequelize from 'sequelize';

import { Model } from './model';
import { CabinetMenuEntity } from '../entities/cabinet_menu';

export class CabinetMenuModel extends Model {
  static singleton: CabinetMenuModel;

  constructor(dbInstance?) {
    if (!CabinetMenuModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'cabinetMenu',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1,
          },
          parent_id: {
            allowNull: true,
            type: Sequelize.UUID,
          },
          order: {
            allowNull: false,
            type: Sequelize.INTEGER,
          },
          name: {
            allowNull: true,
            type: Sequelize.TEXT,
          },
          description: {
            allowNull: true,
            type: Sequelize.TEXT,
          },
          icon: {
            allowNull: true,
            type: Sequelize.TEXT,
          },
          translations: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: {},
          },
          type: {
            allowNull: false,
            type: Sequelize.TEXT,
          },
          options: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: {},
          },
          access: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: {},
          },
          enabled: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
            defaultValue: true,
          },
        },
        {
          tableName: 'cabinet_menu',
          underscored: true,
          timestamps: false,
        },
      );

      (this.model as any).prototype.prepareEntity = this.prepareEntity;
      CabinetMenuModel.singleton = this;
    }

    return CabinetMenuModel.singleton;
  }

  async findById(id) {
    const item = await this.model.findByPk(id);
    return this.prepareEntity(item);
  }

  async getAll(filters = {}) {
    const where: Record<string, any> = {};

    if ((filters as any).id) where.id = (filters as any).id;
    if ((filters as any).parentId) where.parent_id = (filters as any).parentId;
    if ((filters as any).type) where.type = (filters as any).type;
    if (typeof (filters as any).enabled === 'boolean') where.enabled = (filters as any).enabled;

    const items = await this.model.findAll({
      where,
      order: [
        ['parent_id', 'asc'],
        ['order', 'asc'],
        ['name', 'asc'],
      ],
    });

    return items.map((item) => this.prepareEntity(item));
  }

  async create(data) {
    const raw = await this.model.create(this.prepareForModel(data));
    return this.prepareEntity(raw);
  }

  async update(id, data) {
    const [, updatedRaw] = await this.model.update(this.prepareForModel(data), {
      where: { id },
      returning: true,
    });

    if (updatedRaw.length === 1) {
      return this.prepareEntity(updatedRaw[0]);
    }

    return null;
  }

  async hasChildren(parentId) {
    const count = await this.model.count({ where: { parent_id: parentId } });
    return count > 0;
  }

  async sort(items, transaction) {
    await Promise.all(
      items.map((item) =>
        this.model.update(
          {
            parent_id: item.parentId,
            order: item.order,
          },
          {
            where: { id: item.id },
            transaction,
          },
        ),
      ),
    );

    return true;
  }

  async deleteById(id) {
    const result = await this.model.destroy({ where: { id } });
    return result;
  }

  prepareEntity(item) {
    if (!item) {
      return null;
    }

    return new CabinetMenuEntity({
      id: item.id,
      parentId: item.parent_id,
      order: item.order,
      name: item.name,
      description: item.description,
      icon: item.icon,
      translations: item.translations,
      type: item.type,
      options: item.options,
      access: item.access,
      enabled: item.enabled,
    });
  }

  prepareForModel(item) {
    return {
      id: item.id,
      parent_id: item.parentId,
      order: item.order,
      name: item.name,
      description: item.description,
      icon: item.icon,
      translations: item.translations,
      type: item.type,
      options: item.options,
      access: item.access,
      enabled: item.enabled,
    };
  }
}
