// Seeds an active workflow template with entry task templates and gives helpers to drive
// the task and document lifecycle over HTTP as a regular user.
export const SCENARIO = {
  workflowTemplateId: 990100,
  categoryId: 29,
  taskTemplateId: 990101,
  signTaskTemplateId: 990102,
  documentTemplateId: 990101,
  signDocumentTemplateId: 990102,
  userId: 'scenario-user',
};

// Task template ids 990101..990500 are entry templates of the scenario workflow template.
export const TEMPLATE_IDS = Array.from({ length: 400 }, (_, i) => 990101 + i);

const bpmn = (ids: number[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="p">${ids
    .map((id, i) => `<bpmn:sequenceFlow id="f${i}" sourceRef="Event_start" targetRef="Task-${id}"/>`)
    .join('')}</bpmn:process></bpmn:definitions>`;

export const DOCUMENT_SCHEMA = {
  title: 'Scenario document',
  type: 'object',
  pdfRequired: false,
  signRequired: false,
  checkActive: '(documentData) => true',
  calcTriggers: [],
  required: ['name'],
  properties: {
    name: { type: 'string', description: 'Name', maxLength: 20 },
    age: { type: 'number', description: 'Age', minimum: 1, maximum: 150 },
    note: { type: 'string', description: 'Note' },
    flag: { type: 'boolean', description: 'Flag' },
    calculated: {
      type: 'object',
      properties: {
        upper: { type: 'string', value: '({documents}) => "X"', readOnly: true },
      },
    },
    list: { type: 'array', items: { type: 'object', properties: { a: { type: 'string' } } } },
  },
};

export async function seedScenario(app, overrides: any = {}) {
  const now = new Date().toISOString();
  const html = '<!DOCTYPE html><html><body>scenario</body></html>';
  await app.model('workflowTemplate').create({
    id: SCENARIO.workflowTemplateId,
    workflow_template_category_id: SCENARIO.categoryId,
    name: 'Scenario workflow',
    description: '',
    xml_bpmn_schema: bpmn(TEMPLATE_IDS),
    data: {
      entryTaskTemplateIds: TEMPLATE_IDS.map((id) => ({ id: `() => ${id}`, name: `Entry ${id}` })),
      timeline: { steps: [] },
      statuses: [],
    },
    is_active: true,
    access_units: [],
    errors_subscribers: [],
    created_at: now,
    updated_at: now,
  });
  const templates = [
    [SCENARIO.documentTemplateId, SCENARIO.taskTemplateId, DOCUMENT_SCHEMA, { allowCopy: false }],
    [SCENARIO.signDocumentTemplateId, SCENARIO.signTaskTemplateId, { ...DOCUMENT_SCHEMA, signRequired: true }, {}],
  ] as any[];
  for (const [dtId, ttId, documentSchema, taskSchema] of templates) {
    await app.model('documentTemplate').create({
      id: dtId,
      name: `Scenario document ${dtId}`,
      json_schema: JSON.stringify({ ...documentSchema, ...(overrides[dtId] || {}) }),
      html_template: html,
      access_json_schema: { inboxes: { workflowCreator: false }, workflowFiles: { workflowCreator: false } },
      additional_data_to_sign: null,
      created_at: now,
      updated_at: now,
    });
    await app.model('taskTemplate').create({
      id: ttId,
      name: `Scenario task ${ttId}`,
      document_template_id: dtId,
      json_schema: JSON.stringify(taskSchema),
      html_template: html,
      created_at: now,
      updated_at: now,
    });
  }
}

// Create a task template and its document template with the given schemas (id from TEMPLATE_IDS).
export async function addTemplatePair(app, id: number, taskSchema: any = {}, documentSchema: any = {}) {
  const now = new Date().toISOString();
  const html = '<!DOCTYPE html><html><body>scenario</body></html>';
  await app.model('documentTemplate').create({
    id,
    name: `Scenario document ${id}`,
    json_schema: JSON.stringify({ ...DOCUMENT_SCHEMA, ...documentSchema }),
    html_template: html,
    access_json_schema: { inboxes: { workflowCreator: false }, workflowFiles: { workflowCreator: false } },
    additional_data_to_sign: null,
    created_at: now,
    updated_at: now,
  });
  await app.model('taskTemplate').create({
    id,
    name: `Scenario task ${id}`,
    document_template_id: id,
    json_schema: JSON.stringify(taskSchema),
    html_template: html,
    created_at: now,
    updated_at: now,
  });
}

export async function addUnit(app, unit: any) {
  return app.model('unit').create({ description: '', data: {}, menu_config: {}, allow_tokens: [], ...unit });
}

// Make `jwt` a token of the config's test users (lets the sign endpoints accept mocked signatures).
export function registerTestUser(jwt: string) {
  const config = (global as any).config;
  config.auth = { ...config.auth, allowedTestPem: true, allowedTestSign: true };
  config.test_users = { list: [{ token: jwt }] };
}

export function userRequest(app, userId = SCENARIO.userId, extra: any = {}) {
  const { testUser, ...userInfo } = extra;
  return (method: string, path: string) => {
    const { jwt, payload } = app.generateUserToken(userId);
    if (testUser) registerTestUser(jwt);
    app.nockId
      .get('/user/info')
      .query({ access_token: payload.authTokens.accessToken })
      .once()
      .reply(200, { userId, role: 'individual', services: {}, ...userInfo });
    const request = app.request()[method](path).set('token', jwt);
    if (process.env.PROBE) {
      request.on('response', (res) =>
        process.stderr.write(`PROBE ${method} ${path.slice(0, 70)} ${res.status} ${JSON.stringify(res.body).slice(0, 200)}\n`),
      );
    }
    return request;
  };
}
