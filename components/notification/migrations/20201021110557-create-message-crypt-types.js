// Export.
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Create table.
      await queryInterface.createTable('message_crypt_types', {
        id: {
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
          type: Sequelize.INTEGER
        },
        name: {
          allowNull: false,
          type: Sequelize.STRING
        },
        rule_to_show: {
          allowNull: false,
          type: Sequelize.TEXT,
          defaultValue: '(decryptedBase64) => Buffer.from(decryptedBase64, \'base64\').toString(\'utf8\');'
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('NOW()')
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('NOW()')
        }
      });
    } catch (error) {
      console.log('Migration skipped:', error?.message);
    }
  },

  async down(queryInterface) {
    // Drop table.
    await queryInterface.dropTable('message_crypt_types');
  }
};
