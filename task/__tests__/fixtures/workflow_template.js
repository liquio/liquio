const WORKFLOW_TEMPLATE_FIXTURES = [
  {
    id: 161070,
    workflow_template_category_id: 29,
    name: 'Valentine\'s Day',
    description: '',
    xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
    data: {
      statuses: [
        {
          statusId: 1,
          label: 'На розгляді в Амура',
          taskOrEventTemplateId: '{"id":161070001,"type":"task","name":"Тест","sourceId":161070001}',
          taskTemplateId: 161070001,
        },
      ],
      entryTaskTemplateIds: [
        {
          name: 'Start',
          id: '() => false;',
          hidden: true,
        },
      ],
      timeline: {
        steps: [
          {
            taskTemplateId: 161070001,
            label: 'На розгляді в Амура',
          },
        ],
      },
    },
    created_at: '2023-02-14T09:17:29.479Z',
    updated_at: '2023-02-14T14:02:01.867Z',
    is_active: false,
    access_units: [],
    errors_subscribers: [],
  },
  {
    id: 161243,
    workflow_template_category_id: 29,
    name: 'Тест Мультипідпис + globalFunctions',
    description: '',
    xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
    data: {
      globalFunctions: {
        myTest: '() => { return true; }',
      },
      statuses: [
        {
          statusId: 1,
          label: 'Тестовий статус',
          description: 'Ваша заявка отримана і знаходиться на етапі внутрішньої обробки та перевірки даних. Її опрацюють протягом 3 днів.',
          taskOrEventTemplateId: '{"id":161243001,"type":"task","name":"Нова задача","sourceId":161243001}',
          taskTemplateId: 161243001,
        },
      ],
      entryTaskTemplateIds: [
        {
          name: 'Start',
          id: '() => 161243001;',
          hidden: false,
        },
      ],
      timeline: {
        steps: [
          {
            taskTemplateId: 161243001,
            description: 'Ваша заявка отримана і знаходиться на етапі внутрішньої обробки та перевірки даних. Її опрацюють протягом 3 днів.',
            label: 'Тестовий статус',
          },
        ],
      },
    },
    created_at: '2024-05-30T12:33:19.670Z',
    updated_at: '2025-05-15T11:11:00.306Z',
    is_active: true,
    access_units: [],
    errors_subscribers: [],
  },
];

module.exports = { WORKFLOW_TEMPLATE_FIXTURES };
