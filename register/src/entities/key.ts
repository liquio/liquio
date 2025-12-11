import Entity from './entity';

/**
 * Key entity.
 */
export default class KeyEntity extends Entity {
  // ID
  id: number;

  // Key register ID
  registerId: number;

  // Name
  name: string;

  // Key description
  description: string;

  // Key schema
  schema: KeySchema;

  // Parent ID
  parentId: number;

  // Key metadata
  meta: KeyMeta;

  // To string function
  toString: string;

  // To search string function
  toSearchString: string;

  // Created by
  createdBy: string;

  // Updated by
  updatedBy: string;

  // Key access mode (full, read_only, write_only)
  accessMode: 'full' | 'read_only' | 'write_only';

  // Whether key records are encrypted
  isEncrypted: boolean;

  // To export
  toExport: string;

  // Created at
  createdAt: string;

  // Updated at
  updatedAt: string;

  // Key signature
  keySignature?: { validationIdentity: string[] };

  constructor({
    id,
    register_id,
    name,
    description,
    schema,
    parent_id,
    meta,
    to_string,
    to_search_string,
    created_by,
    updated_by,
    access_mode,
    is_encrypted,
    to_export,
    created_at,
    updated_at
  }) {
    super();

    this.id = id;
    this.registerId = register_id;
    this.name = name;
    this.description = description;
    this.schema = schema;
    this.parentId = parent_id;
    this.meta = meta;
    this.toString = to_string;
    this.toSearchString = to_search_string;
    this.createdBy = created_by;
    this.updatedBy = updated_by;
    this.accessMode = access_mode;
    this.isEncrypted = is_encrypted;
    this.toExport = to_export;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
  }
}

export interface KeyRaw {
  id?: number;
  register_id: number;
  name: string;
  description: string;
  schema: KeySchema;
  parent_id: number;
  meta: KeyMeta;
  to_string: string;
  to_search_string: string;
  created_by: string;
  updated_by: string;
  access_mode: 'full' | 'read_only' | 'write_only';
  to_export: string;
  is_encrypted: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface KeySchema {
  type: string;
  properties: { [key: string]: any };
  [key: string]: any;
}

export interface KeyMeta {
  afterhandlers?: string[];
  isTest?: boolean;
  isPersonal?: boolean;
  isSaveViewingHistory?: boolean;
  createdByPerson?: any;
  updatedByPerson?: any;
  [key: string]: any;
}
