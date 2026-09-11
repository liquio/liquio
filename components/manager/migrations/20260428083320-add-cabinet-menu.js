'use strict';

const ITEMS = {
  orderService: '00000000-0000-4000-8000-000000000015',
  messages: '00000000-0000-4000-8000-000000000001',
  tasks: '00000000-0000-4000-8000-000000000002',
  inboxTasks: '00000000-0000-4000-8000-000000000003',
  unitInboxTasks: '00000000-0000-4000-8000-000000000004',
  closedTasks: '00000000-0000-4000-8000-000000000005',
  unitClosedTasks: '00000000-0000-4000-8000-000000000006',
  workflow: '00000000-0000-4000-8000-000000000007',
  myWorkflow: '00000000-0000-4000-8000-000000000008',
  drafts: '00000000-0000-4000-8000-000000000009',
  trash: '00000000-0000-4000-8000-000000000010',
  users: '00000000-0000-4000-8000-000000000011',
  inbox: '00000000-0000-4000-8000-000000000012',
  registry: '00000000-0000-4000-8000-000000000013'
};

const translations = (en, uk, nl) => ({
  en,
  uk,
  nl
});

const createItem = ({
  id,
  parentId = null,
  order,
  name,
  translations: itemTranslations,
  route = '',
  icon = null,
  type = 'link',
  access = {}
}) => ({
  id,
  parent_id: parentId,
  order,
  name,
  description: null,
  icon,
  translations: JSON.stringify(itemTranslations),
  type,
  options: JSON.stringify({
    ...(route ? { route } : {}),
    system: true
  }),
  access: JSON.stringify(access),
  enabled: true
});

const cabinetMenuItems = [
  createItem({
    id: ITEMS.orderService,
    order: 0,
    name: 'Order service',
    translations: {
      en: 'Order service',
      de: 'Leistung bestellen',
      nl: 'Dienst aanvragen',
      fr: 'Demander un service',
      ua: 'Замовити послугу',
      gb: 'Order service'
    },
    route: '/services',
    icon: 'AddIcon',
    type: 'button',
    access: {
      isUnitedUser: false,
      unitHasAccessTo: 'navigation.tasks.CreateTaskButton'
    }
  }),
  createItem({
    id: ITEMS.messages,
    order: 1,
    name: 'Incoming messages',
    translations: translations('Incoming messages', 'Вхідні повідомлення', 'Inkomende berichten'),
    route: '/messages',
    icon: 'MessageOutlinedIcon'
  }),
  createItem({
    id: ITEMS.tasks,
    order: 2,
    name: 'Tasks',
    translations: translations('Tasks', 'Задачі', 'Taken'),
    icon: 'WorkOutlineIcon',
    access: {
      isUnitedUser: false,
      unitHasAccessTo: [
        'navigation.tasks.InboxTasks',
        'navigation.tasks.UnitInboxTasks',
        'navigation.tasks.ClosedTasks',
        'navigation.tasks.UnitClosedTasks'
      ]
    }
  }),
  createItem({
    id: ITEMS.inboxTasks,
    parentId: ITEMS.tasks,
    order: 0,
    name: 'My Tasks',
    translations: translations('My Tasks', 'Мої задачі', 'Mijn taken'),
    route: '/tasks/my-tasks',
    access: {
      isUnitedUser: false,
      unitHasAccessTo: 'navigation.tasks.InboxTasks'
    }
  }),
  createItem({
    id: ITEMS.unitInboxTasks,
    parentId: ITEMS.tasks,
    order: 1,
    name: 'Department Tasks',
    translations: translations('Department Tasks', 'Задачі відділу', 'Afdelingstaken'),
    route: '/tasks/unit-tasks',
    access: {
      unitHasAccessTo: 'navigation.tasks.UnitInboxTasks'
    }
  }),
  createItem({
    id: ITEMS.closedTasks,
    parentId: ITEMS.tasks,
    order: 2,
    name: 'Archive of my tasks',
    translations: translations('Archive of my tasks', 'Архів моїх задач', 'Archief van mijn taken'),
    route: '/tasks/closed-tasks',
    access: {
      isUnitedUser: false,
      unitHasAccessTo: 'navigation.tasks.ClosedTasks'
    }
  }),
  createItem({
    id: ITEMS.unitClosedTasks,
    parentId: ITEMS.tasks,
    order: 3,
    name: 'Department Task Archive',
    translations: translations('Department Task Archive', 'Архів задач відділу', 'Archief van afdelingstaken'),
    route: '/tasks/closed-unit-tasks',
    access: {
      unitHasAccessTo: 'navigation.tasks.UnitClosedTasks'
    }
  }),
  createItem({
    id: ITEMS.workflow,
    order: 3,
    name: 'My Services',
    translations: translations('My Services', 'Мої послуги', 'Mijn diensten'),
    icon: 'DoneAllIcon',
    access: {
      isUnitedUser: false,
      unitHasAccessTo: [
        'navigation.workflow.MyWorkflow',
        'navigation.workflow.Drafts',
        'navigation.workflow.Trash'
      ]
    }
  }),
  createItem({
    id: ITEMS.myWorkflow,
    parentId: ITEMS.workflow,
    order: 0,
    name: 'Ordered Services',
    translations: translations('Ordered Services', 'Замовлені послуги', 'Aangevraagde diensten'),
    route: '/workflow',
    access: {
      isUnitedUser: false,
      unitHasAccessTo: 'navigation.workflow.MyWorkflow'
    }
  }),
  createItem({
    id: ITEMS.drafts,
    parentId: ITEMS.workflow,
    order: 1,
    name: 'Drafts',
    translations: translations('Drafts', 'Чернетки', 'Concepten'),
    route: '/workflow/drafts',
    access: {
      isUnitedUser: false,
      unitHasAccessTo: 'navigation.workflow.Drafts'
    }
  }),
  createItem({
    id: ITEMS.trash,
    parentId: ITEMS.workflow,
    order: 2,
    name: 'Basket',
    translations: translations('Basket', 'Кошик', 'Prullenbak'),
    route: '/workflow/trash',
    access: {
      isUnitedUser: false,
      unitHasAccessTo: 'navigation.workflow.Trash'
    }
  }),
  createItem({
    id: ITEMS.users,
    order: 4,
    name: 'Users',
    translations: translations('Users', 'Користувачі', 'Gebruikers'),
    route: '/users',
    icon: 'AccessibilityNewOutlinedIcon',
    access: {
      isUserUnitHead: true,
      unitHasAccessTo: ['navigation.users.list']
    }
  }),
  createItem({
    id: ITEMS.inbox,
    order: 5,
    name: 'Received documents',
    translations: translations('Received documents', 'Отримані документи', 'Ontvangen documenten'),
    route: '/workflow/inbox',
    icon: 'InsertDriveFileIcon',
    access: {
      isUnitedUser: false,
      unitHasAccessTo: 'navigation.inbox.InboxFilesListPage'
    }
  }),
  createItem({
    id: ITEMS.registry,
    order: 6,
    name: 'Registers',
    translations: translations('Registers', 'Реєстри', 'Registers'),
    route: '/registry',
    icon: 'StorageOutlinedIcon',
    access: {
      unitHasAccessTo: 'navigation.registry.RegistryPage'
    }
  })
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('cabinet_menu', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV1
      },
      parent_id: {
        allowNull: true,
        type: Sequelize.UUID,
        references: {
          model: 'cabinet_menu',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      order: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      name: {
        allowNull: true,
        type: Sequelize.TEXT
      },
      description: {
        allowNull: true,
        type: Sequelize.TEXT
      },
      icon: {
        allowNull: true,
        type: Sequelize.TEXT
      },
      translations: {
        allowNull: false,
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      type: {
        allowNull: false,
        type: Sequelize.TEXT
      },
      options: {
        allowNull: false,
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      access: {
        allowNull: false,
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      enabled: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: true
      }
    });

    await queryInterface.addIndex('cabinet_menu', ['parent_id'], {
      name: 'cabinet_menu_parent_id_key',
      unique: false
    });

    await queryInterface.bulkInsert('cabinet_menu', cabinetMenuItems);
  },

  async down (queryInterface) {
    await queryInterface.removeIndex('cabinet_menu', 'cabinet_menu_parent_id_key');
    await queryInterface.dropTable('cabinet_menu');
  }
};
