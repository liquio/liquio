import { getConfig } from 'core/helpers/configLoader';

export default (t) => {
  const config = getConfig();
  const additionalInterfaces = config?.additionalInterfaces || [];
  let additionalNavigation = {};

  if (Array.isArray(additionalInterfaces) && additionalInterfaces.length) {
    additionalInterfaces.forEach((item) => {
      if (Array.isArray(item.properties) && item.properties.length) {
        const properties = {};
        item.properties.forEach((prop) => {
          properties[prop.key] = {
            control: 'toggle',
            columns: 6,
            onText: prop.text,
          };
        });
        additionalNavigation[item.key] = {
          type: 'object',
          control: 'form.group',
          outlined: false,
          blockDisplay: true,
          description: item.description,
          notRequiredLabel: '',
          properties: {
            ...properties,
          },
        };
      }
    });
  }

  return {
    type: 'object',
    properties: {
      menuConfig: {
        type: 'object',
        control: 'form.group',
        blockDisplay: true,
        outlined: false,
        properties: {
          defaultRoute: {
            type: 'string',
            description: t('HomePage'),
            darkTheme: true,
            notRequiredLabel: '',
            variant: 'outlined',
            sample: `<span style='color: rgba(255, 255, 255, 0.6);'>${t(
              'Example'
            )}</span>`,
          },
          debugMode: {
            control: 'toggle',
            noMargin: true,
            onText: t('DebugMode'),
          },
          divider: {
            control: 'text.block',
            htmlBlock: "<div style='margin-bottom: 20px' />",
          },
          navigation: {
            type: 'object',
            properties: {
              inbox: {
                type: 'object',
                properties: {
                  InboxFilesListPage: {
                    control: 'toggle',
                    noMargin: true,
                    onText: t('Documents'),
                  },
                },
              },
              divider: {
                control: 'text.block',
                htmlBlock: "<div style='margin-bottom: 20px' />",
              },
              registry: {
                type: 'object',
                properties: {
                  RegistryPage: {
                    control: 'toggle',
                    noMargin: true,
                    onText: t('Registry'),
                  },
                },
              },
              divider2: {
                control: 'text.block',
                htmlBlock: "<div style='margin-bottom: 20px' />",
              },
              CreateTaskButton: {
                control: 'toggle',
                noMargin: true,
                onText: t('CreateTaskButton'),
              },
              divider3: {
                control: 'text.block',
                htmlBlock: "<div style='margin-bottom: 20px' />",
              },
              users: {
                type: 'object',
                properties: {
                  list: {
                    control: 'toggle',
                    noMargin: true,
                    onText: t('UsersManagement'),
                  },
                  divider: {
                    control: 'text.block',
                    htmlBlock: "<div style='margin-bottom: 30px' />",
                  },
                },
              },
              tasks: {
                type: 'object',
                control: 'form.group',
                outlined: false,
                blockDisplay: true,
                description: t('Tasks'),
                properties: {
                  InboxTasks: {
                    control: 'toggle',
                    columns: 6,
                    onText: t('MyTasks'),
                    uiFilter: 'tasks.my.opened',
                  },
                  UnitInboxTasks: {
                    control: 'toggle',
                    columns: 6,
                    onText: t('UnitTasks'),
                    uiFilter: 'tasks.unit.opened',
                  },
                  ClosedTasks: {
                    control: 'toggle',
                    columns: 6,
                    onText: t('ClosedMyTasks'),
                    uiFilter: 'tasks.my.closed',
                  },
                  UnitClosedTasks: {
                    control: 'toggle',
                    columns: 6,
                    onText: t('UnitClosedTasks'),
                    uiFilter: 'tasks.unit.closed',
                  },
                },
              },
              divider4: {
                control: 'text.block',
                htmlBlock: "<div style='margin-bottom: 30px' />",
              },
              workflow: {
                type: 'object',
                control: 'form.group',
                outlined: false,
                blockDisplay: true,
                description: t('MyServices'),
                properties: {
                  MyWorkflow: {
                    control: 'toggle',
                    columns: 6,
                    onText: t('OrderedServices'),
                    uiFilter: 'workflows.not-draft',
                  },
                  Drafts: {
                    control: 'toggle',
                    columns: 6,
                    onText: t('Drafts'),
                    uiFilter: 'workflows.draft',
                  },
                  Trash: {
                    control: 'toggle',
                    columns: 6,
                    onText: t('Trash'),
                  },
                },
                required: ['MyWorkflow', 'Drafts', 'Trash'],
              },
              divider5: {
                control: 'text.block',
                htmlBlock: "<div style='margin-bottom: 30px' />",
              },
              ...additionalNavigation,
            },
            required: ['inbox', 'messages', 'registry', 'tasks', 'workflow'],
          },
        },
      },
    },
  };
};
