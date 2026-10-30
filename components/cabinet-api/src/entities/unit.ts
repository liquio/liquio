import Entity from './entity';

interface UnitEntityData {
  id?: number;
  parentId?: number;
  basedOn?: number[];
  name?: string;
  description?: string;
  members?: string[];
  heads?: string[];
  data?: Record<string, unknown>;
  menuConfig?: Record<string, unknown>;
  allowTokens?: string[];
  headsIpn?: string[];
  membersIpn?: string[];
  requestedMembers?: Array<{
    ipn: string;
    firstName: string;
    middleName: string;
    lastName: string;
    wrongUserInfo: boolean;
  }>;
}

/**
 * Unit entity.
 */
export default class UnitEntity extends Entity {
  id?: number;
  parentId?: number;
  basedOn: number[];
  name?: string;
  description?: string;
  members: string[];
  heads: string[];
  data?: Record<string, unknown>;
  menuConfig?: Record<string, unknown>;
  allowTokens: string[];
  headsIpn: string[];
  membersIpn: string[];
  requestedMembers: Array<{
    ipn: string;
    firstName: string;
    middleName: string;
    lastName: string;
    wrongUserInfo: boolean;
  }>;

  /**
   * Constructor.
   * @param options Unit object.
   */
  constructor({
    id,
    parentId,
    basedOn,
    name,
    description,
    members = [],
    heads = [],
    data,
    menuConfig,
    allowTokens = [],
    headsIpn = [],
    membersIpn = [],
    requestedMembers = [],
  }: UnitEntityData) {
    super();

    this.id = id;
    this.parentId = parentId;
    this.basedOn = basedOn || [];
    this.name = name;
    this.description = description;
    this.members = members || [];
    this.heads = heads || [];
    this.data = data;
    this.menuConfig = menuConfig;
    this.allowTokens = allowTokens || [];
    this.headsIpn = headsIpn || [];
    this.membersIpn = membersIpn || [];
    this.requestedMembers = requestedMembers || [];
  }

  /**
   * Get filtered properties.
   * @returns Filtered properties list.
   */
  getFilterProperties(): string[] {
    return ['id', 'parentId', 'basedOn', 'name', 'description', 'members', 'heads', 'data', 'menuConfig', 'requestedMembers'];
  }

  /**
   * Get filtered properties brief.
   * @returns Filtered properties brief list.
   */
  getFilterPropertiesBrief(): string[] {
    return ['id', 'parentId', 'basedOn', 'name', 'description', 'data', 'menuConfig'];
  }

  /**
   * Get heads and members as one list.
   * @returns Users IDs list.
   */
  getHeadsAndMembers(): string[] {
    return [...new Set([...this.heads, ...this.members])];
  }
}
