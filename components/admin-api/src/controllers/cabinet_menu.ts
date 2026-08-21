import { randomUUID } from 'node:crypto';
import { matchedData } from 'express-validator';

import { Controller } from './controller';
import { CabinetMenuBusiness } from '../businesses/cabinet_menu';

export class CabinetMenuController extends Controller {
  private static singleton: CabinetMenuController;

  private business: CabinetMenuBusiness;

  constructor(config?) {
    if (!CabinetMenuController.singleton) {
      super(config);
      this.business = new CabinetMenuBusiness(config);
      CabinetMenuController.singleton = this;
    }

    return CabinetMenuController.singleton;
  }

  async findById(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });

    try {
      const item = await this.business.findById(id);
      if (!item) {
        return this.responseError(res, 'Not found.', 404);
      }

      this.responseData(res, item);
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  async getAll(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });

    try {
      const items = await this.business.getAll(queryData);
      this.responseData(res, items);
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  async create(req, res) {
    const bodyData: any = matchedData(req, { locations: ['body'] });

    try {
      const nextId = bodyData.id || randomUUID();
      const parentValidationError = await this.validateParent(bodyData.parentId, nextId);
      if (parentValidationError) {
        return this.responseError(res, parentValidationError, 400);
      }

      const savedItem = await this.business.create({
        id: nextId,
        parentId: bodyData.parentId || null,
        order: bodyData.order,
        name: bodyData.name ?? null,
        description: bodyData.description ?? null,
        icon: bodyData.icon ?? null,
        translations: bodyData.translations || {},
        type: bodyData.type,
        options: bodyData.options || {},
        access: bodyData.access || {},
        enabled: typeof bodyData.enabled === 'boolean' ? bodyData.enabled : true,
      });

      this.responseData(res, savedItem);
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  async update(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });
    const bodyData: any = matchedData(req, { locations: ['body'] });

    try {
      const existing = await this.business.findById(id);
      if (!existing) {
        return this.responseError(res, 'Not found.', 404);
      }

      const nextParentId = bodyData.parentId !== undefined ? bodyData.parentId : existing.parentId;
      const parentValidationError = await this.validateParent(nextParentId, id);
      if (parentValidationError) {
        return this.responseError(res, parentValidationError, 400);
      }

      const isSystem = Boolean(existing.options && existing.options.system);

      const savedItem = await this.business.update(id, {
        id,
        parentId: nextParentId,
        order: bodyData.order !== undefined ? bodyData.order : existing.order,
        name: bodyData.name !== undefined ? bodyData.name : existing.name,
        description: bodyData.description !== undefined ? bodyData.description : existing.description,
        icon: bodyData.icon !== undefined ? bodyData.icon : existing.icon,
        translations: bodyData.translations !== undefined ? bodyData.translations : existing.translations,
        type: isSystem ? existing.type : bodyData.type !== undefined ? bodyData.type : existing.type,
        options: isSystem ? existing.options : bodyData.options !== undefined ? bodyData.options : existing.options,
        access: isSystem ? existing.access : bodyData.access !== undefined ? bodyData.access : existing.access,
        enabled: bodyData.enabled !== undefined ? bodyData.enabled : existing.enabled,
      });

      this.responseData(res, savedItem);
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  async delete(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });

    try {
      const existing = await this.business.findById(id);
      if (!existing) {
        return this.responseError(res, 'Not found.', 404);
      }

      await this.business.deleteById(id);
      this.responseThatAccepted(res);
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  async sort(req, res) {
    const bodyData: any = matchedData(req, { locations: ['body'] });
    const items = bodyData.items || [];

    try {
      const hierarchyValidationError = await this.validateSortHierarchy(items);
      if (hierarchyValidationError) {
        return this.responseError(res, hierarchyValidationError, 400);
      }

      const transaction = await global.db.transaction();

      try {
        await this.business.sort(
          items.map((item) => ({
            id: item.id,
            parentId: item.parentId || null,
            order: item.order,
          })),
          transaction,
        );
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      this.responseThatAccepted(res);
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  async validateParent(parentId, currentId) {
    if (parentId === undefined || parentId === null) {
      return null;
    }

    if (parentId === currentId) {
      return 'Item cannot be parent for itself.';
    }

    const parent = await this.business.findById(parentId);
    if (!parent) {
      return 'Parent item not found.';
    }

    if (parent.parentId) {
      return 'Menu hierarchy supports only two levels.';
    }

    const hasChildren = await this.business.hasChildren(currentId);
    if (hasChildren) {
      return 'Menu hierarchy supports only two levels.';
    }

    return null;
  }

  async validateSortHierarchy(items) {
    const existingItems = await this.business.getAll({});
    const parentById = new Map(existingItems.map((item) => [item.id, item.parentId || null]));

    items.forEach((item) => {
      parentById.set(item.id, item.parentId || null);
    });

    for (const [id, parentId] of parentById.entries()) {
      if (parentId === id) {
        return 'Item cannot be parent for itself.';
      }

      if (!parentId) {
        continue;
      }

      if (!parentById.has(parentId)) {
        return 'Parent item not found.';
      }

      let depth = 0;
      let currentParentId = parentId;
      const visited = new Set([id]);

      while (currentParentId) {
        if (visited.has(currentParentId)) {
          return 'Menu hierarchy contains a cycle.';
        }

        visited.add(currentParentId);
        depth += 1;

        if (depth > 1) {
          return 'Menu hierarchy supports only two levels.';
        }

        currentParentId = parentById.get(currentParentId);
      }
    }

    return null;
  }
}
