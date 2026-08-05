import axios from 'axios';
import { matchedData } from 'express-validator';

import { Controller } from './controller';
import { Stream } from '../lib/stream';
import { FileStorageService } from '../services/filestorage';

/**
 * Admin file library controller.
 */
export class FileLibraryController extends Controller {
  private static singleton: FileLibraryController;

  private filestorage: FileStorageService;

  constructor(config?) {
    if (!FileLibraryController.singleton) {
      super(config);
      this.filestorage = new FileStorageService();
      FileLibraryController.singleton = this;
    }

    return FileLibraryController.singleton;
  }

  async list(req, res) {
    const { parent_id: parentId = null } = matchedData(req, { locations: ['query'] });
    const items = await global.models.fileLibraryItem.getChildren({
      parentId,
      userId: this.getRequestUserId(req),
      userUnitIds: this.getRequestUserUnitIds(req),
    });
    return this.responseData(res, items);
  }

  async get(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });
    const item = await global.models.fileLibraryItem.getById(id);
    if (!item) {
      return this.responseError(res, 'Not found.', 404);
    }
    const canRead = await global.models.fileLibraryItem.canAccess(item, {
      userId: this.getRequestUserId(req),
      userUnitIds: this.getRequestUserUnitIds(req),
      permission: 'read',
    });
    if (!canRead) {
      return this.responseError(res, 'Forbidden.', 403);
    }

    const grants = await global.models.fileLibraryItem.getGrants(id);
    return this.responseData(res, { ...item, grants });
  }

  async createFolder(req, res) {
    try {
      const body = matchedData(req, { locations: ['body'] });
      const userId = this.getRequestUserId(req);
      await this.checkParentWriteAccess(body.parent_id, req);

      const item = await global.models.fileLibraryItem.createItem({
        type: 'folder',
        parentId: body.parent_id,
        name: body.name,
        ownerUserId: body.owner_user_id || userId,
        visibility: body.visibility || 'private',
        createdBy: userId,
      });

      return this.responseData(res, item, false, 201);
    } catch (error) {
      return this.responseError(res, error, this.getErrorStatus(error));
    }
  }

  async uploadFile(req, res) {
    try {
      const query = matchedData(req, { locations: ['query'] });
      const userId = this.getRequestUserId(req);
      await this.checkParentWriteAccess(query.parent_id, req);

      const chunks: any[] = [];
      req.on('data', (data) => chunks.push(data));
      await Stream.waitEndEvent(req);
      const content = Buffer.concat(chunks);
      if (!content.length) {
        return this.responseError(res, 'Can not upload empty file.', 400);
      }

      const contentType = req.headers['content-type'] || 'application/octet-stream';
      const uploaded = await this.filestorage.upload({
        name: query.name,
        contentType,
        contentLength: req.headers['content-length'] || content.length,
        content,
        withPreview: query.with_preview !== 'false',
        meta: { source: 'admin-file-library' },
      });
      const file = uploaded?.data;
      if (!file?.id) {
        return this.responseError(res, 'Can not upload file to filestorage.', 500);
      }

      const item = await global.models.fileLibraryItem.createItem({
        type: 'file',
        parentId: query.parent_id,
        name: query.name,
        fileId: file.id,
        ownerUserId: query.owner_user_id || userId,
        visibility: query.visibility || 'private',
        createdBy: userId,
        previewStatus: 'pending',
      });

      return this.responseData(res, item, false, 201);
    } catch (error) {
      return this.responseError(res, error, this.getErrorStatus(error));
    }
  }

  async update(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const body = matchedData(req, { locations: ['body'] });
      const userId = this.getRequestUserId(req);
      await this.checkItemManageAccess(id, req);
      if (typeof body.parent_id !== 'undefined') {
        await this.checkParentWriteAccess(body.parent_id, req);
      }

      const item = await global.models.fileLibraryItem.updateItem(id, {
        name: body.name,
        parentId: body.parent_id,
        visibility: body.visibility,
        ownerUserId: body.owner_user_id,
        updatedBy: userId,
      });
      if (!item) {
        return this.responseError(res, 'Not found.', 404);
      }

      return this.responseData(res, item);
    } catch (error) {
      return this.responseError(res, error, this.getErrorStatus(error));
    }
  }

  async remove(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      await this.checkItemManageAccess(id, req);
      const deletedRowsCount = await global.models.fileLibraryItem.softDelete(id, this.getRequestUserId(req));
      return this.responseData(res, { deletedRowsCount });
    } catch (error) {
      return this.responseError(res, error, this.getErrorStatus(error));
    }
  }

  async setGrants(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const { grants } = matchedData(req, { locations: ['body'] });
      await this.checkItemManageAccess(id, req);
      const updatedGrants = await global.models.fileLibraryItem.replaceGrants(id, grants, this.getRequestUserId(req));
      return this.responseData(res, updatedGrants);
    } catch (error) {
      return this.responseError(res, error, this.getErrorStatus(error));
    }
  }

  async createPublicLink(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const { expires_at: expiresAt = null } = matchedData(req, { locations: ['body'] });
      await this.checkItemManageAccess(id, req);
      const item = await global.models.fileLibraryItem.createPublicLink(id, {
        expiresAt,
        updatedBy: this.getRequestUserId(req),
      });
      if (!item) {
        return this.responseError(res, 'Not found.', 404);
      }
      return this.responseData(res, { ...item, publicUrl: this.getPublicUrl(item) });
    } catch (error) {
      return this.responseError(res, error, this.getErrorStatus(error));
    }
  }

  async disablePublicLink(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      await this.checkItemManageAccess(id, req);
      const item = await global.models.fileLibraryItem.disablePublicLink(id, this.getRequestUserId(req));
      if (!item) {
        return this.responseError(res, 'Not found.', 404);
      }
      return this.responseData(res, item);
    } catch (error) {
      return this.responseError(res, error, this.getErrorStatus(error));
    }
  }

  async download(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const item = await this.getReadableFileItem(id, req, 'read');
      return this.proxyFilestorage(res, await this.filestorage.downloadFileRequestOptions(item.fileId));
    } catch (error) {
      return this.responseError(res, error, this.getErrorStatus(error));
    }
  }

  async preview(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const item = await this.getReadableFileItem(id, req, 'read');
      return this.proxyFilestorage(res, await this.filestorage.downloadPreviewRequestOptions(item.fileId));
    } catch (error) {
      return this.responseError(res, error, this.getErrorStatus(error));
    }
  }

  async publicDownload(req, res) {
    const { slug } = matchedData(req, { locations: ['params'] });
    const item = await global.models.fileLibraryItem.getPublicBySlug(slug);
    if (!item || item.type !== 'file' || !item.fileId) {
      return this.responseError(res, 'Not found.', 404);
    }
    return this.proxyFilestorage(res, await this.filestorage.downloadFileRequestOptions(item.fileId), {
      contentDisposition: this.getInlineContentDisposition(item.name),
    });
  }

  async publicPreview(req, res) {
    const { slug } = matchedData(req, { locations: ['params'] });
    const item = await global.models.fileLibraryItem.getPublicBySlug(slug);
    if (!item || item.type !== 'file' || !item.fileId) {
      return this.responseError(res, 'Not found.', 404);
    }
    return this.proxyFilestorage(res, await this.filestorage.downloadPreviewRequestOptions(item.fileId));
  }

  async checkParentWriteAccess(parentId, req) {
    if (!parentId) {
      return;
    }
    const parent = await global.models.fileLibraryItem.getById(parentId);
    if (!parent || parent.type !== 'folder') {
      throw new Error('Parent folder not found.');
    }
    const canWrite = await global.models.fileLibraryItem.canAccess(parent, {
      userId: this.getRequestUserId(req),
      userUnitIds: this.getRequestUserUnitIds(req),
      permission: 'write',
    });
    if (!canWrite) {
      throw new Error('Forbidden.');
    }
  }

  async checkItemManageAccess(id, req) {
    const canManage = await global.models.fileLibraryItem.canAccess(id, {
      userId: this.getRequestUserId(req),
      userUnitIds: this.getRequestUserUnitIds(req),
      permission: 'manage',
    });
    if (!canManage) {
      throw new Error('Forbidden.');
    }
  }

  async getReadableFileItem(id, req, permission) {
    const item = await global.models.fileLibraryItem.getById(id);
    if (!item || item.type !== 'file' || !item.fileId) {
      throw new Error('File not found.');
    }
    const canRead = await global.models.fileLibraryItem.canAccess(item, {
      userId: this.getRequestUserId(req),
      userUnitIds: this.getRequestUserUnitIds(req),
      permission,
    });
    if (!canRead) {
      throw new Error('Forbidden.');
    }
    return item;
  }

  getPublicUrl(item) {
    return `/file-library/public/${item.publicSlug}/${encodeURIComponent(item.name)}`;
  }

  getInlineContentDisposition(fileName) {
    const fallbackName = String(fileName || 'file').replace(/["\\\r\n]/g, '_');
    return `inline; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName || 'file')}`;
  }

  async proxyFilestorage(res, requestOptions, options: any = {}) {
    const response = await axios({
      ...requestOptions,
      responseType: 'stream',
      validateStatus: () => true,
    });
    if (response.status >= 400) {
      res.status(response.status);
    }
    if (response.headers['content-type']) {
      res.set('content-type', response.headers['content-type']);
    }
    if (options.contentDisposition) {
      res.set('content-disposition', options.contentDisposition);
    } else if (response.headers['content-disposition']) {
      res.set('content-disposition', response.headers['content-disposition']);
    }
    return response.data.pipe(res);
  }

  getErrorStatus(error) {
    if (error?.message === 'Forbidden.') {
      return 403;
    }
    if (error?.message?.includes('not found') || error?.message?.includes('Not found')) {
      return 404;
    }
    return 500;
  }
}
