const Entity = require('./entity');

/**
 * Unit entity.
 */
class UnitEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Unit object.
   * @param {number} options.id ID.
   * @param {number} options.parentId Parent ID.
   * @param {object} options.parent Parent object.
   * @param {number[]} options.basedOn Based on.
   * @param {string} options.name Name.
   * @param {string} options.description Description.
   * @param {string[]} options.members Members.
   * @param {string[]} options.heads Heads.
   * @param {object} options.data Data.
   * @param {object} options.menuConfig Menu config.
   * @param {string[]} options.allow_tokens Allow tokens.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   * @param {string[]} options.headsIpn Heads Ipn.
   * @param {string[]} options.membersIpn Members Ipn.
   * @param {{ipn: string, firstName: string, middleName: string, lastName: string, wrongUserInfo: boolean}[]} options.requestedMembers Requested members.
   */
  constructor({
    id,
    parentId,
    parent,
    basedOn,
    name,
    description,
    members,
    heads,
    data,
    menuConfig,
    allowTokens,
    createdAt,
    updatedAt,
    headsIpn,
    membersIpn,
    requestedMembers = [],
  }) {
    super();

    this.id = id;
    this.parentId = parentId;
    this.parent = parent;
    this.basedOn = basedOn || [];
    this.name = name;
    this.description = description;
    this.members = members || [];
    this.heads = heads || [];
    this.data = data;
    this.menuConfig = menuConfig;
    this.allowTokens = allowTokens || [];
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.headsIpn = headsIpn || [];
    this.membersIpn = membersIpn || [];
    this.requestedMembers = requestedMembers || [];
  }

  /**
   * Get filtered properties.
   * @returns {string[]} Filtered properties list.
   */
  getFilterProperties() {
    return ['id', 'parentId', 'basedOn', 'name', 'description', 'members', 'heads', 'data', 'menuConfig', 'requestedMembers'];
  }

  /**
   * Get filtered properties brief.
   * @returns {string[]} Filtered properties brief list.
   */
  getFilterPropertiesBrief() {
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

module.exports = UnitEntity;
