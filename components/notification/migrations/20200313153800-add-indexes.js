// Export.
module.exports = {
  async up(queryInterface) {
    try {
      await queryInterface.addIndex('incomming_messages', ['list_user_id']);
      await queryInterface.addIndex('incomming_messages', ['event_id']);
      await queryInterface.addIndex('incomming_messages', ['date_create']);
      await queryInterface.addIndex('incomming_messages', ['workflow_id']);
      await queryInterface.addIndex('incomming_messages', ['user_ipn']);
      await queryInterface.addIndex('incomming_messages', ['processing_id']);
      await queryInterface.addIndex('events', ['name']);
      await queryInterface.addIndex('events', ['out_event_id']);
      await queryInterface.addIndex('users_messages', ['user_id']);
      await queryInterface.addIndex('users_messages', ['message_id']);
      await queryInterface.addIndex('users_messages', ['event_id']);
      await queryInterface.addIndex('users_messages', ['is_read']);
    } catch (error) {
      console.log('Migration skipped:', error?.message);
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('incomming_messages', 'list_user_id');
    await queryInterface.removeIndex('incomming_messages', 'event_id');
    await queryInterface.removeIndex('incomming_messages', 'date_create');
    await queryInterface.removeIndex('incomming_messages', 'workflow_id');
    await queryInterface.removeIndex('incomming_messages', 'user_ipn');
    await queryInterface.removeIndex('incomming_messages', 'processing_id');
    await queryInterface.removeIndex('events', 'name');
    await queryInterface.removeIndex('events', 'out_event_id');
    await queryInterface.removeIndex('users_messages', 'user_id');
    await queryInterface.removeIndex('users_messages', 'message_id');
    await queryInterface.removeIndex('users_messages', 'event_id');
    await queryInterface.removeIndex('users_messages', 'is_read');
  }
};
