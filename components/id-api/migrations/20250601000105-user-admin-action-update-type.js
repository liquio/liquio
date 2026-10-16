module.exports = {
  async up(queryInterface) {
    // Privileged changes made through named service clients are audited as `update` (KS-24).
    return queryInterface.sequelize.query(`ALTER TYPE public."enum_delete_history_action_type" ADD VALUE IF NOT EXISTS 'update';`);
  },
  async down() {
    // Enum values cannot be dropped.
  },
};
