// Export.
module.exports = {
  /**
   * Migarte up.
   * Change files table. Add SHA256 hash.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('files', 'hash', {
      allowNull: false,
      type: Sequelize.JSON,
      defaultValue: {
        md5: null,
        sha1: null,
        sha256: null
      }
    });
  },

  /**
   * Migarte down.
   * Change files table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('files', 'hash', {
      allowNull: false,
      type: Sequelize.JSON,
      defaultValue: {
        md5: null,
        sha1: null
      }
    });
  }
};
