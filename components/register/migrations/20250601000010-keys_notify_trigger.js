module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TRIGGER keys_notify
      AFTER INSERT OR DELETE OR UPDATE ON public.keys
      FOR EACH ROW EXECUTE FUNCTION public.generic_notify_event('keys_row_change_notify');
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS keys_notify ON public.keys;
    `);
  },
}; 