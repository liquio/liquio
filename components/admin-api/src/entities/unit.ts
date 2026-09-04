import { Entity } from './entity';

interface UnitEntityOptions {
  /** ID. */
  id: number;
  /** Parent ID. */
  parentId: number;
  /** Parent object. */
  parent: object;
  /** Based on. */
  basedOn: number[];
  /** Name. */
  name: string;
  /** Description. */
  description: string;
  /** Members. */
  members: string[];
  /** Heads. */
  heads: string[];
  /** Data. */
  data: object;
  /** Menu config. */
  menuConfig: object;
  /** Allow tokens. */
  allowTokens: string[];
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
  /** Heads Ipn. */
  headsIpn: string[];
  /** Members Ipn. */
  membersIpn: string[];
  requestedMembers?: { ipn: string; firstName: string; middleName: string; lastName: string; wrongUserInfo: boolean }[];
}

/**
 * Unit entity.
 */
export class UnitEntity extends Entity<UnitEntityOptions> {
  constructor(options: UnitEntityOptions) {
    super(options);

    this.basedOn = options.basedOn || [];
    this.members = options.members || [];
    this.heads = options.heads || [];
    this.allowTokens = options.allowTokens || [];
    this.headsIpn = options.headsIpn || [];
    this.membersIpn = options.membersIpn || [];
    this.requestedMembers = options.requestedMembers || [];
  }

  /**
   * Get filtered properties.
   * @returns {string[]} Filtered properties list.
   */
  getFilterProperties(): (keyof UnitEntityOptions)[] {
    return ['id', 'parentId', 'basedOn', 'name', 'description', 'members', 'heads', 'data', 'menuConfig', 'requestedMembers'];
  }

  /**
   * Get filtered properties brief.
   * @returns {string[]} Filtered properties brief list.
   */
  getFilterPropertiesBrief(): (keyof UnitEntityOptions)[] {
    return this.getFilterProperties();
  }

  /**
   * Get heads and members as one list.
   * @returns {string[]} Users IDs list.
   */
  getHeadsAndMembers() {
    return [...new Set([...this.heads, ...this.members])];
  }

  /**
   * Get prepared for export.
   * @returns {object} Prepared for export object.
   */
  getPreparedForExport() {
    return {
      id: this.id,
      parentId: this.parentId,
      parent: this.parent,
      basedOn: this.basedOn,
      name: this.name,
      description: this.description,
      data: this.data,
      menuConfig: this.menuConfig,
      allowTokens: this.allowTokens,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      members: [],
      heads: [],
      membersIpn: [],
      headsIpn: [],
      requestedMembers: [],
    };
  }
}

export interface UnitEntity extends UnitEntityOptions {}
