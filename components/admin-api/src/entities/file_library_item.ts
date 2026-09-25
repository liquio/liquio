import { Entity } from './entity';

interface FileLibraryItemEntityOptions {
  id: string;
  type: string;
  parentId?: string;
  name: string;
  fileId?: string;
  ownerUserId: string;
  visibility: string;
  publicSlug?: string;
  publicEnabled: boolean;
  publicExpiresAt?: string;
  previewStatus: string;
  previewError?: string;
  createdBy: string;
  updatedBy: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class FileLibraryItemEntity extends Entity<FileLibraryItemEntityOptions> {
  constructor(raw: any = {}) {
    super();

    this.id = raw.id;
    this.type = raw.type;
    this.parentId = raw.parent_id;
    this.name = raw.name;
    this.fileId = raw.file_id;
    this.ownerUserId = raw.owner_user_id;
    this.visibility = raw.visibility;
    this.publicSlug = raw.public_slug;
    this.publicEnabled = raw.public_enabled;
    this.publicExpiresAt = raw.public_expires_at;
    this.previewStatus = raw.preview_status;
    this.previewError = raw.preview_error;
    this.createdBy = raw.created_by;
    this.updatedBy = raw.updated_by;
    this.deletedAt = raw.deleted_at;
    this.createdAt = raw.created_at;
    this.updatedAt = raw.updated_at;
  }
}

export interface FileLibraryItemEntity extends FileLibraryItemEntityOptions {}
