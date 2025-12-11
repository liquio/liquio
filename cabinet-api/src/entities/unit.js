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
   * @param {number[]} options.basedOn Based on.
   * @param {string} options.name Name.
   * @param {string} options.description Description.
   * @param {string[]} options.members Members.
   * @param {string[]} options.heads Heads.
   * @param {object} options.data Date.
   * @param {object} options.menuConfig Menu config.
   * @param {string[]} options.allowTokens Allow tokens.
   * @param {string[]} options.headsIpn Heads IPN.
   * @param {string[]} options.membersIpn Members IPN.
   * @param {{ipn: string, firstName: string, middleName: string, lastName: string, wrongUserInfo: boolean}[]} options.requestedMembers Requested members.
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
  }) {
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
    return ['id', 'parentId', 'basedOn', 'name', 'description', 'data', 'menuConfig'];
  }

  /**
   * Get heads and members as one list.
   * @returns {string[]} Users IDs list.
   */
  getHeadsAndMembers() {
    return [...new Set([...this.heads, ...this.members])];
  }
}

module.exports = UnitEntity;
