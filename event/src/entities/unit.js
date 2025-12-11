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
   * @param {string[]} options.headsIpn Heads Ipn.
   * @param {string[]} options.membersIpn Members Ipn.
   */
  constructor({ id, parentId, basedOn, name, description, members, heads, data, menuConfig, allowTokens, headsIpn, membersIpn }) {
    super();

    this.id = id;
    this.parentId = parentId;
    this.basedOn = basedOn;
    this.name = name;
    this.description = description;
    this.members = members || [];
    this.heads = heads || [];
    this.data = data;
    this.menuConfig = menuConfig;
    this.allowTokens = allowTokens;
    this.headsIpn = headsIpn;
    this.membersIpn = membersIpn;
  }

  getFilterProperties() {
    return ['id', 'parentId', 'basedOn', 'name', 'description', 'members', 'heads', 'data', 'menuConfig'];
  }

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
}

module.exports = UnitEntity;
