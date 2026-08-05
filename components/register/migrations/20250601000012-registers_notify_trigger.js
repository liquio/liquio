module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TRIGGER registers_notify
      AFTER INSERT OR DELETE OR UPDATE ON public.registers
      FOR EACH ROW EXECUTE FUNCTION public.generic_notify_event('registers_row_change_notify');
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS registers_notify ON public.registers;
    `);
  },
}; 