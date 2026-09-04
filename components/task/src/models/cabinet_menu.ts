import Sequelize from 'sequelize';

import { Model } from './model';
import { CabinetMenuEntity } from '../entities/cabinet_menu';

export class CabinetMenuModel extends Model {
  private static singleton: CabinetMenuModel;

  model: any;

  constructor() {
    if (!CabinetMenuModel.singleton) {
      super();

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

      this.model.prototype.prepareEntity = this.prepareEntity;
      CabinetMenuModel.singleton = this;
    }

    return CabinetMenuModel.singleton;
  }

  async getNavigationTree() {
    const items = await this.model.findAll({
      where: { enabled: true },
      order: [
        ['parent_id', 'asc'],
        ['order', 'asc'],
        ['name', 'asc'],
      ],
    });

    return this.buildTree(items.map((item) => this.prepareEntity(item)));
  }

  buildTree(items: CabinetMenuEntity[]) {
    const nodesById = new Map(items.map((item) => [item.id, this.prepareNavigationNode(item)]));
    const roots = [];

    for (const node of nodesById.values()) {
      if (node.parentId && nodesById.has(node.parentId)) {
        nodesById.get(node.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortNodes = (nodes) => {
      nodes.sort((a, b) => {
        if (a.order !== b.order) {
          return a.order - b.order;
        }

        return String(a.name || '').localeCompare(String(b.name || ''));
      });

      nodes.forEach((node) => sortNodes(node.children));
      return nodes;
    };

    return sortNodes(roots);
  }

  prepareNavigationNode(item: CabinetMenuEntity) {
    const route = this.resolveRoute(item);

    return {
      id: item.id,
      parentId: item.parentId,
      order: item.order,
      name: item.name,
      description: item.description,
      icon: item.icon,
      translations: item.translations,
      type: item.type,
      options: item.options,
      access: item.access,
      enabled: item.enabled,
      path: route,
      children: [],
    };
  }

  resolveRoute(item: CabinetMenuEntity) {
    const route = item?.options?.route;

    if (typeof route !== 'string' || !route.length) {
      return null;
    }

    return route;
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
}
