/* eslint-disable no-template-curly-in-string */

export default ({
  t,
  taskTemplates,
  events,
  workflowStatuses,
  numberTemplates,
}) => ({
  type: 'object',
  calcTriggers: [
    {
      source: 'data.statuses',
      target: 'data.timeline.steps',
      calculate:
        'value => (value || []).map(({taskTemplateId, eventTemplateId, description, label}) => ({taskTemplateId, eventTemplateId, description, label}))',
    },
    {
      source: 'data.statuses.${index}.taskTemplateId',
      target: 'data.timeline.steps.${index}.taskTemplateId',
      calculate: 'value => value',
    },
    {
      source: 'data.statuses.${index}.eventTemplateId',
      target: 'data.timeline.steps.${index}.eventTemplateId',
      calculate: 'value => value',
    },
    {
      source: 'data.statuses.${index}.label',
      target: 'data.timeline.steps.${index}.label',
      calculate: 'value => value',
    },
    {
      source: 'data.statuses.${index}.description',
      target: 'data.timeline.steps.${index}.description',
      calculate: 'value => value',
    },
  ],
  properties: {
    name: {
      type: 'string',
      description: t('WorkflowName'),
      maxLength: 255,
    },
    description: {
      control: 'string.element',
      description: t('WorkflowDescription'),
      multiline: true,
      rows: 2,
      maxLength: 255,
    },
    isActive: {
      control: 'toggle',
      darkTheme: true,
      fullWidth: true,
      labelPlacement: 'start',
      offText: t('WorkflowIsActive'),
    },
    data: {
      control: 'tabs',
      type: 'object',
      emptyHidden: false,
      properties: {
        entryTaskTemplateIds: {
          description: t('WorkflowEntryTask'),
          control: 'table',
          type: 'array',
          allowEmpty: true,
          items: {
            name: {
              type: 'string',
              description: t('WorkflowInfoName'),
              maxLength: 255,
            },
            id: {
              control: 'code.editor',
              description: t('WorkflowEntryTaskFunction'),
              mode: 'javascript',
            },
            hidden: {
              control: 'toggle',
              darkTheme: true,
              fullWidth: true,
              labelPlacement: 'start',
              description: t('HideInCreateTaskDialog'),
            },
          },
          required: ['id'],
        },
        info: {
          description: t('WorkflowInfo'),
          control: 'table',
          type: 'array',
          allowEmpty: true,
          items: {
            name: {
              type: 'string',
              description: t('WorkflowInfoName'),
              maxLength: 255,
            },
            link: {
              type: 'string',
              description: t('WorkflowInfoLink'),
              maxLength: 255,
            },
          },
          required: ['name', 'link'],
        },
        statuses: {
          description: t('WorkflowStatuses'),
          type: 'array',
          allowEmpty: true,
          fixedTable: true,
          items: {
            properties: {
              taskTemplateId: {
                control: 'select',
                options: taskTemplates,
                description: t('WorkflowTaskTemplate'),
              },
              eventTemplateId: {
                control: 'select',
                options: events,
                description: t('WorkflowEvent'),
              },
              statusId: {
                control: 'select',
                options: workflowStatuses,
                description: t('WorkflowStatus'),
              },
              label: {
                type: 'string',
                description: t('WorkflowTimelineLabel'),
              },
              description: {
                type: 'string',
                description: t('WorkflowTimelineDescription'),
                multiline: true,
                cutTags: false,
                rows: 4,
              },
            },
            required: [],
          },
        },
        deadline: {
          type: 'string',
          description: t('Deadline'),
          helperText: t('DeadlineSample'),
          maxLength: 10,
        },
        numberTemplateId: {
          control: 'select',
          width: 640,
          options: numberTemplates,
          description: t('NumberTemplate'),
        },
      },
    },
  },
  required: ['name'],
});
