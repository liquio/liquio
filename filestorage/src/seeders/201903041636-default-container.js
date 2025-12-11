'use strict';

module.exports = {
  /**
   * Migarte up.
   * Add default containers.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  up: (queryInterface) => {
    const now = new Date();
    return queryInterface.bulkInsert(
      'containers',
      [
        {
          id: 1,
          name: 'default',
          description: 'Default container',
          meta: '{}',
          created_by: 'system',
          updated_by: 'system',
          created_at: now,
          updated_at: now,
        },
      ],
      {},
    );
  },

  /**
   * Migarte down.
   * Drop default containers.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  down: (queryInterface, Sequelize) => {
    const { Op } = Sequelize;
    return queryInterface.bulkDelete('containers', { id: { [Op.in]: [1] } }, {});
  },
};
