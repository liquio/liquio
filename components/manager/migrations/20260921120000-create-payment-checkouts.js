'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payment_checkouts', {
      document_id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
      payment_control_path: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
      attempt_id: { type: Sequelize.UUID, allowNull: false },
      calculated: { type: Sequelize.JSONB, allowNull: true },
      success_status: { type: Sequelize.JSONB, allowNull: true },
      paid: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('payment_checkouts');
  },
};
