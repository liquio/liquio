module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('templates', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      method: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      html: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
      pdf: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
      json_map: {
        allowNull: true,
        type: Sequelize.JSONB,
      },
      options: {
        allowNull: true,
        type: Sequelize.JSONB,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('templates', ['id']);
    await queryInterface.addIndex('templates', ['name', 'method']);

    queryInterface.addConstraint('templates', {
      fields: ['name', 'method'],
      type: 'unique',
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeIndex('templates', 'id');
    await queryInterface.removeIndex('templates', ['name', 'method']);

    await queryInterface.removeConstraint('templates', ['name', 'method']);

    await queryInterface.dropTable('templates');
  },
};
