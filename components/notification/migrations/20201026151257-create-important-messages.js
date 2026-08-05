// Export.
module.exports = {
  /**
   * Migrate up.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  async up(queryInterface, Sequelize) {
    try {
      // Create table.
      await queryInterface.createTable('important_messages', {
        id: {
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
          type: Sequelize.INTEGER
        },
        user_message_id: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'users_messages'
            },
            key: 'user_message_id'
          }
        },
        message_id: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'incomming_messages'
            },
            key: 'message_id'
          }
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        allow_hide: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        expired_at: {
          allowNull: true,
          type: Sequelize.DATE
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

      // Add indexes.
      await queryInterface.addIndex('important_messages', ['id']);
      await queryInterface.addIndex('important_messages', ['user_message_id']);
      await queryInterface.addIndex('important_messages', ['message_id']);
    } catch (error) {
      console.log('Migration skipped:', error?.message);
    }
  },

  /**
   * Migrate down.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  async down(queryInterface) {
    // Remove indexes.
    await queryInterface.removeIndex('important_messages', 'id');
    await queryInterface.removeIndex('important_messages', 'user_message_id');
    await queryInterface.removeIndex('important_messages', 'message_id');

    // Drop table.
    await queryInterface.dropTable('important_messages');
  }
};
