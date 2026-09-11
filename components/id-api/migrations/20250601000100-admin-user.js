const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const username = process.env.LIQUIO_ADMIN_USERNAME || 'admin';

    await queryInterface.sequelize.query(`
      INSERT INTO public.users ("userId", "email", "role", "ipn")
      VALUES ('000000000000000000000001', '${username}', 'individual;admin', '0000000001')
      ON CONFLICT ("email") DO NOTHING;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM public.users
      WHERE "email" = 'admin';
    `);
  }
};
