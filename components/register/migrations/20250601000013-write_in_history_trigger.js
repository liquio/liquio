module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TRIGGER write_in_history_trigger
      AFTER INSERT OR DELETE OR UPDATE ON public.records
      FOR EACH ROW EXECUTE FUNCTION public.write_in_history_function();
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS write_in_history_trigger ON public.records;
    `);
  },
}; 