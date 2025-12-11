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
  user_data: '{"userId":"test","userName":"Test User","isLegal":false,"isIndividualEntrepreneur":false}',
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
];

module.exports = { WORKFLOW_FIXTURES };
