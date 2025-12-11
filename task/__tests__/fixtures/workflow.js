const GENERIC_WORKFLOW_FIXTURE = {
  name: null,
  is_final: false,
  cancellation_type_id: null,
  created_by: 'test',
  updated_by: 'test',
  data: {},
  due_date: null,
  created_at: '2023-02-14T13:02:59.974Z',
  updated_at: '2023-02-14T13:02:59.974Z',
  workflow_status_id: null,
  number: null,
  user_data: '{"userId":"test","userName":"Тест Микола Іванович","isLegal":false,"isIndividualEntrepreneur":false}',
  has_unresolved_errors: false,
  created_by_unit_heads: [],
  created_by_units: [],
  observer_units: [],
  is_personal: true,
  parent_id: null,
  created_by_ipn: null,
  entry_task_template_id: null,
  statuses: [],
  elastic_reindex_state: null,
};

const WORKFLOW_FIXTURES = [
  {
    ...GENERIC_WORKFLOW_FIXTURE,
    id: 'a26753f0-1119-11ef-b95e-15b9ffbcc467',
    workflow_template_id: 161070,
  },
  {
    ...GENERIC_WORKFLOW_FIXTURE,
    id: 'e8c65cba-e899-4da8-966b-a308d0169e30',
    workflow_template_id: 161070,
  },
  {
    ...GENERIC_WORKFLOW_FIXTURE,
    id: '7512ff43-abe4-4e9c-b814-8319d49dc891',
    workflow_template_id: 161070,
  },
  {
    ...GENERIC_WORKFLOW_FIXTURE,
    id: '954f1f35-829b-4c02-9949-f326b94fb9f8',
    workflow_template_id: 161070,
  },
  {
    ...GENERIC_WORKFLOW_FIXTURE,
    id: '510cc744-d8a9-4fe0-9b6c-d0b3be1ff67a',
    workflow_template_id: 161243,
  },
];

module.exports = { WORKFLOW_FIXTURES };
