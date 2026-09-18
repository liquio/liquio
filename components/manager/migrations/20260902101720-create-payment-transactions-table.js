'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('payment_transactions', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      document_id: {
        allowNull: false,
        type: Sequelize.STRING
      },
      payment_control_path: {
        allowNull: false,
        type: Sequelize.STRING
      },
      task_id: {
        allowNull: true,
        type: Sequelize.STRING
      },
      workflow_id: {
        allowNull: true,
        type: Sequelize.STRING
      },
      extra_data: {
        allowNull: true,
        type: Sequelize.JSON,
        defaultValue: {}
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down (queryInterface) {
    await queryInterface.dropTable('payment_transactions');
  }
};
