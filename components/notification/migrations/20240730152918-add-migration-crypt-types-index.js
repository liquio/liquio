// Export.
module.exports = {
  /**
   * Migrate up.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  async up(queryInterface) {
    // Define transaction.
    const transaction = await queryInterface.sequelize.transaction();

    // Try to migrate up.
    try {
      // Add indexes.
      queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS incomming_messages_message_crypt_type_id_idx ON incomming_messages USING btree (message_crypt_type_id);',
        { type: queryInterface.sequelize.QueryTypes.UPDATE },
        { transaction }
      );

      // Commit transaction.
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Migrate down.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  async down(queryInterface) {
    // Define transaction.
    const transaction = await queryInterface.sequelize.transaction();

    // Try to migrate down.
    try {
      // Drop indexes.
      queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS incomming_messages_message_crypt_type_id_idx;',
        { type: queryInterface.sequelize.QueryTypes.UPDATE },
        { transaction }
      );

      // Commit transaction.
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
