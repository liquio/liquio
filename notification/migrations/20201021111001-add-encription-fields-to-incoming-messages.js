// Export.
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Add columns.
      await queryInterface.addColumn('incomming_messages', 'message_crypt_type_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'message_crypt_types',
          key: 'id'
        }
      });
      await queryInterface.addColumn('incomming_messages', 'is_encrypted', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
      await queryInterface.addColumn('incomming_messages', 'decrypted_base64', {
        type: Sequelize.TEXT,
        allowNull: true
      });

      // Add index.
      await queryInterface.addIndex('incomming_messages', ['is_encrypted']);
    } catch (error) {
      console.log('Migration skipped:', error?.message);
    }
  },

  async down(queryInterface) {
    // Remove columns.
    queryInterface.removeColumn('incomming_messages', 'message_crypt_type_id');
    queryInterface.removeColumn('incomming_messages', 'is_encrypted');
    queryInterface.removeColumn('incomming_messages', 'decrypted_base64');

    // Remove index.
    await queryInterface.removeIndex('incomming_messages', 'is_encrypted');
  }
};
