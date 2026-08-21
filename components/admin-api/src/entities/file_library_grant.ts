import { Entity } from './entity';

interface FileLibraryGrantEntityOptions {
  id: string;
  itemId: string;
  subjectType: string;
  subjectId: string;
  permission: string;
  inherit: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export class FileLibraryGrantEntity extends Entity<FileLibraryGrantEntityOptions> {
  constructor(raw: any = {}) {
    super();

    this.id = raw.id;
    this.itemId = raw.item_id;
    this.subjectType = raw.subject_type;
    this.subjectId = raw.subject_id;
    this.permission = raw.permission;
    this.inherit = raw.inherit;
    this.createdBy = raw.created_by;
    this.createdAt = raw.created_at;
    this.updatedAt = raw.updated_at;
  }
}

export interface FileLibraryGrantEntity extends FileLibraryGrantEntityOptions {}
