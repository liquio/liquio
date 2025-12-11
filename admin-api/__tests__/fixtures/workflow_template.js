const WORKFLOW_TEMPLATE_FIXTURES = [
  {
    id: 161070,
    workflow_template_category_id: 29,
    name: 'Test Workflow Template',
    description: 'Test workflow template for admin-api e2e tests',
    xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
    data: {
      statuses: [
        {
          statusId: 1,
          label: 'Under Review',
          taskOrEventTemplateId: '{"id":161070001,"type":"task","name":"Test","sourceId":161070001}',
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
            label: 'Under Review',
          },
        ],
      },
    },
    created_at: '2023-02-14T09:17:29.479Z',
    updated_at: '2023-02-14T14:02:01.867Z',
    is_active: true,
    access_units: [],
    errors_subscribers: [],
  },
];

module.exports = { WORKFLOW_TEMPLATE_FIXTURES };
