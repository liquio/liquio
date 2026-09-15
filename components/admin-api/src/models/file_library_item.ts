import crypto from 'node:crypto';
import Sequelize from 'sequelize';

import { Model } from './model';
import { FileLibraryItemEntity } from '../entities/file_library_item';
import { SYSTEM_ADMIN_UNIT } from '../constants/unit';

const ITEM_TYPES = ['folder', 'file'];
const VISIBILITIES = ['private', 'public'];
const PERMISSIONS = ['read', 'write', 'manage'];
const PERMISSION_RANK = {
  read: 1,
  write: 2,
  manage: 3,
};

export class FileLibraryItemModel extends Model {
  static singleton: FileLibraryItemModel;

  constructor(dbInstance?) {
    if (!FileLibraryItemModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'file_library_item',
        {
          id: {
            type: Sequelize.UUID,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4,
            allowNull: false,
          },
          type: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          parent_id: Sequelize.UUID,
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          file_id: Sequelize.UUID,
          owner_user_id: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          visibility: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'private',
          },
          public_slug: Sequelize.STRING,
          public_enabled: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          public_expires_at: Sequelize.DATE,
          preview_status: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'pending',
          },
          preview_error: Sequelize.TEXT,
          created_by: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          updated_by: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          deleted_at: Sequelize.DATE,
        },
        {
          tableName: 'file_library_items',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      FileLibraryItemModel.singleton = this;
    }

    return FileLibraryItemModel.singleton;
  }

  prepareEntity(raw) {
    return raw ? new FileLibraryItemEntity(raw.get ? raw.get({ plain: true }) : raw) : null;
  }

  normalizeUnitIds(userUnitIds: any = {}) {
    return [...new Set([...(userUnitIds.head || []), ...(userUnitIds.member || []), ...(userUnitIds.all || [])])].map(String);
  }

  isSystemAdmin(userUnitIds: any = {}) {
    return this.normalizeUnitIds(userUnitIds).includes(String(SYSTEM_ADMIN_UNIT));
  }

  permissionMatches(actual, required = 'read') {
    return (PERMISSION_RANK[actual] || 0) >= (PERMISSION_RANK[required] || 1);
  }

  validateType(type) {
    if (!ITEM_TYPES.includes(type)) {
      throw new Error(`Invalid file library item type: ${type}`);
    }
  }

  validateVisibility(visibility) {
    if (!VISIBILITIES.includes(visibility)) {
      throw new Error(`Invalid file library item visibility: ${visibility}`);
    }
  }

  validatePermission(permission) {
    if (!PERMISSIONS.includes(permission)) {
      throw new Error(`Invalid file library permission: ${permission}`);
    }
  }

  async getById(id) {
    const raw = await this.model.findOne({ where: { id, deleted_at: null } });
    return this.prepareEntity(raw);
  }

  async getPublicBySlug(publicSlug) {
    const raw = await this.model.findOne({
      where: {
        public_slug: publicSlug,
        public_enabled: true,
        visibility: 'public',
        deleted_at: null,
        [Sequelize.Op.or]: [{ public_expires_at: null }, { public_expires_at: { [Sequelize.Op.gt]: new Date() } }],
      },
    });
    return this.prepareEntity(raw);
  }

  async getChildren({ parentId = null, userId, userUnitIds, includeDeleted = false }: any) {
    const where: any = {
      parent_id: parentId || null,
    };
    if (!includeDeleted) {
      where.deleted_at = null;
    }

    const rows = await this.model.findAll({
      where,
      order: [
        ['type', 'asc'],
        ['name', 'asc'],
      ],
    });

    const items = rows.map((row) => this.prepareEntity(row));
    if (this.isSystemAdmin(userUnitIds)) {
      return items;
    }

    const accessible = [];
    for (const item of items) {
      if (await this.canAccess(item.id, { userId, userUnitIds, permission: 'read' })) {
        accessible.push(item);
      }
    }
    return accessible;
  }

  async canAccess(itemOrId, { userId, userUnitIds, permission = 'read' }: any) {
    if (this.isSystemAdmin(userUnitIds)) {
      return true;
    }

    const item = typeof itemOrId === 'string' ? await this.getById(itemOrId) : itemOrId;
    if (!item) {
      return false;
    }
    if (item.ownerUserId === userId) {
      return true;
    }
    if (permission === 'read' && item.visibility === 'public') {
      return true;
    }

    const unitIds = this.normalizeUnitIds(userUnitIds);
    const replacements = {
      item_id: item.id,
      user_id: userId,
      unit_ids: unitIds,
    };

    const [rows]: any = await this.db.query(
      `
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, 0 depth FROM file_library_items WHERE id = :item_id AND deleted_at IS NULL
        UNION ALL
        SELECT parent.id, parent.parent_id, ancestors.depth + 1
        FROM file_library_items parent
        JOIN ancestors ON ancestors.parent_id = parent.id
        WHERE parent.deleted_at IS NULL
      )
      SELECT grants.permission
      FROM file_library_grants grants
      JOIN ancestors ON ancestors.id = grants.item_id
      WHERE
        (ancestors.depth = 0 OR grants.inherit = true)
        AND (
          (grants.subject_type = 'user' AND grants.subject_id = :user_id)
          OR (grants.subject_type = 'unit' AND grants.subject_id IN (:unit_ids))
        )
      `,
      { replacements: { ...replacements, unit_ids: unitIds.length ? unitIds : ['__none__'] } },
    );

    return rows.some((row) => this.permissionMatches(row.permission, permission));
  }

  async createItem({
    type,
    parentId = null,
    name,
    fileId = null,
    ownerUserId,
    visibility = 'private',
    createdBy,
    previewStatus = 'unsupported',
  }: any) {
    this.validateType(type);
    this.validateVisibility(visibility);

    if (type === 'folder' && fileId) {
      throw new Error('Folder can not reference a file.');
    }
    if (type === 'file' && !fileId) {
      throw new Error('File library file requires fileId.');
    }

    const raw = await this.model.create({
      type,
      parent_id: parentId || null,
      name,
      file_id: fileId,
      owner_user_id: ownerUserId,
      visibility,
      public_enabled: visibility === 'public',
      preview_status: previewStatus,
      created_by: createdBy,
      updated_by: createdBy,
    });

    return this.prepareEntity(raw);
  }

  async updateItem(id, { name, parentId, visibility, ownerUserId, updatedBy, previewStatus, previewError }: any) {
    const patch: any = {};
    if (typeof name !== 'undefined') patch.name = name;
    if (typeof parentId !== 'undefined') patch.parent_id = parentId || null;
    if (typeof visibility !== 'undefined') {
      this.validateVisibility(visibility);
      patch.visibility = visibility;
      if (visibility === 'private') {
        patch.public_enabled = false;
      }
    }
    if (typeof ownerUserId !== 'undefined') patch.owner_user_id = ownerUserId;
    if (typeof previewStatus !== 'undefined') patch.preview_status = previewStatus;
    if (typeof previewError !== 'undefined') patch.preview_error = previewError;
    if (typeof updatedBy !== 'undefined') patch.updated_by = updatedBy;

    const [count, rows] = await this.model.update(patch, { where: { id, deleted_at: null }, returning: true });
    if (!count) {
      return null;
    }
    return this.prepareEntity(rows[0]);
  }

  async softDelete(id, userId) {
    const [rows]: any = await this.db.query(
      `
      WITH RECURSIVE descendants AS (
        SELECT id FROM file_library_items WHERE id = :id AND deleted_at IS NULL
        UNION ALL
        SELECT child.id
        FROM file_library_items child
        JOIN descendants ON child.parent_id = descendants.id
        WHERE child.deleted_at IS NULL
      )
      UPDATE file_library_items
      SET deleted_at = NOW(), updated_by = :user_id, updated_at = NOW()
      WHERE id IN (SELECT id FROM descendants)
      RETURNING id
      `,
      { replacements: { id, user_id: userId } },
    );
    return rows.length;
  }

  async replaceGrants(itemId, grants: any[] = [], userId) {
    await global.models.fileLibraryGrant.model.destroy({ where: { item_id: itemId } });
    const rows = grants.map((grant) => {
      const subjectType = grant.subjectType || grant.subject_type;
      const subjectId = grant.subjectId || grant.subject_id;
      if (!['unit', 'user'].includes(subjectType)) {
        throw new Error(`Invalid file library grant subject type: ${subjectType}`);
      }
      if (!subjectId) {
        throw new Error('File library grant subject id is required.');
      }
      this.validatePermission(grant.permission);
      return {
        item_id: itemId,
        subject_type: subjectType,
        subject_id: String(subjectId),
        permission: grant.permission,
        inherit: typeof grant.inherit === 'undefined' ? true : grant.inherit,
        created_by: userId,
      };
    });
    if (rows.length) {
      await global.models.fileLibraryGrant.model.bulkCreate(rows);
    }
    return this.getGrants(itemId);
  }

  async getGrants(itemId) {
    const rows = await global.models.fileLibraryGrant.model.findAll({ where: { item_id: itemId }, order: [['created_at', 'asc']] });
    return rows.map((row) => global.models.fileLibraryGrant.prepareEntity(row));
  }

  async createPublicLink(id, { expiresAt = null, updatedBy }: any) {
    const slug = crypto.randomBytes(24).toString('base64url');
    const [count, rows] = await this.model.update(
      {
        visibility: 'public',
        public_enabled: true,
        public_slug: slug,
        public_expires_at: expiresAt,
        updated_by: updatedBy,
      },
      { where: { id, deleted_at: null }, returning: true },
    );
    if (!count) {
      return null;
    }
    return this.prepareEntity(rows[0]);
  }

  async disablePublicLink(id, updatedBy) {
    const [count, rows] = await this.model.update(
      {
        public_enabled: false,
        public_slug: null,
        public_expires_at: null,
        visibility: 'private',
        updated_by: updatedBy,
      },
      { where: { id, deleted_at: null }, returning: true },
    );
    if (!count) {
      return null;
    }
    return this.prepareEntity(rows[0]);
  }
}
