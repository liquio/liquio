'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('file_library_items', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      parent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'file_library_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      file_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      owner_user_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      visibility: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'private',
      },
      public_slug: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      public_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      public_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      preview_status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      preview_error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      updated_by: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.createTable('file_library_grants', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'file_library_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      subject_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      subject_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      permission: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'read',
      },
      inherit: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('file_library_items', ['parent_id']);
    await queryInterface.addIndex('file_library_items', ['file_id']);
    await queryInterface.addIndex('file_library_items', ['owner_user_id']);
    await queryInterface.addIndex('file_library_items', ['public_slug']);
    await queryInterface.addIndex('file_library_items', ['deleted_at']);
    await queryInterface.addIndex('file_library_grants', ['item_id']);
    await queryInterface.addIndex('file_library_grants', ['subject_type', 'subject_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('file_library_grants');
    await queryInterface.dropTable('file_library_items');
  },
};
