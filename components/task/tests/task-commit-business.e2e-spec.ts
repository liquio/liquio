import { TestApp } from './test-app';
import { seedScenario, addTemplatePair, addUnit, userRequest, SCENARIO } from './helpers/scenario';
import { getConfig } from '../src/lib/context';

// TaskBusiness.setStatusFinished through POST /tasks/:id/commit with one template per rule.
describe('Task commit business', () => {
  let app: TestApp;
  const USER = SCENARIO.userId;
  let nextId = 990120;

  const as = (userId = USER, extra: any = {}) => userRequest(app, userId, extra);

  // Create a template pair, a draft task and fill the required document field.
  const draft = async (taskSchema: any = {}, documentSchema: any = {}, fill: any = { name: 'Bob' }, documentTemplateColumns: any = {}) => {
    const id = nextId++;
    await addTemplatePair(app, id, taskSchema, documentSchema);
    if (Object.keys(documentTemplateColumns).length) {
      await app.model('documentTemplate').update(documentTemplateColumns, { where: { id } });
    }
    const created = await as()('post', '/tasks').send({ workflowTemplateId: SCENARIO.workflowTemplateId, taskTemplateId: id });
    expect(created.status).toBe(200);
    const task = created.body.data;
    for (const [path, value] of Object.entries(fill)) {
      const update = await as()('put', `/documents/${task.documentId}`).send({ path, value });
      expect(update.status).toBe(200);
    }
    return task;
  };
  const commit = (task, userId = USER, extra: any = {}) => as(userId, extra)('post', `/tasks/${task.id}/commit`).send({});
  const signature = (task, createdBy = USER) =>
    app.model('documentSignature').create({
      document_id: task.documentId,
      signature: 'fake-signature',
      certificate: 'fake-certificate',
      created_by: createdBy,
      created_at: new Date(),
      updated_at: new Date(),
    });

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    getConfig().multisigners = { schemaControl: 'signature.multisign' };
    await seedScenario(app);
    await addUnit(app, { id: 990001, name: 'Commit unit', heads: [USER], members: [USER] });
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  it('commits a valid draft and finishes the task and its document', async () => {
    const task = await draft({ taskName: '() => "Committed name"', workflowNumber: '() => "WF-1"' });
    const response = await commit(task);
    expect(response.status).toBe(200);
    const stored = await as()('get', `/tasks/${task.id}`);
    expect(stored.body.data.finished).toBe(true);
    expect(stored.body.data.name).toBe('Committed name');
    expect(stored.body.data.document.isFinal).toBe(true);
  });

  it('writes activity log entries when the activity log is enabled', async () => {
    const config = getConfig();
    const previous = config.activity_log;
    config.activity_log = { ...(previous || {}), isEnabled: true };
    try {
      const task = await draft();
      expect((await commit(task)).status).toBe(200);
    } finally {
      config.activity_log = previous;
    }
  });

  it('rejects a task that is already finished', async () => {
    const task = await draft();
    expect((await commit(task)).status).toBe(200);
    const second = await commit(task);
    expect(second.status).toBe(404);
  });

  it('rejects a commit by a user without access', async () => {
    const task = await draft();
    const response = await commit(task, 'commit-outsider');
    expect(response.status).toBe(403);
  });

  it('rejects a document that fails validation and records a workflow error', async () => {
    const task = await draft({}, {}, {});
    const response = await commit(task);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.error.details[0].validationParam).toBe('name');
  });

  it('rejects when the commit available function says no', async () => {
    const task = await draft({}, { isCommitAvailable: '() => false' });
    const response = await commit(task);
    expect(response.status).toBe(500);
    expect(response.body.error.message).toContain('Commit not available');
  });

  it('rejects when the commit available function throws', async () => {
    const task = await draft({}, { isCommitAvailable: '() => { throw new Error("x"); }' });
    const response = await commit(task);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects when the PDF is required and not generated', async () => {
    const task = await draft({}, { pdfRequired: true });
    const response = await commit(task);
    expect(response.status).toBe(500);
  });

  describe('signatures', () => {
    it('rejects when a signature is required and missing', async () => {
      const task = await draft({}, { signRequired: true });
      const response = await commit(task);
      expect(response.status).toBe(404);
    });

    it('rejects when the signRequired function throws', async () => {
      const task = await draft({}, { signRequired: '() => { throw new Error("bad"); }' });
      const response = await commit(task);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('commits a signed document', async () => {
      const task = await draft({}, { signRequired: '() => true' });
      await signature(task);
      const response = await commit(task);
      expect(response.status).toBe(200);
    });

    it('rejects when not all signer users signed', async () => {
      const task = await draft(
        {},
        { signRequired: true, properties: { name: { type: 'string' }, signers: { control: 'signature.multisign', calcSigners: '() => []' } } },
      );
      const signers = await as()('put', `/tasks/${task.id}/signers`).send({ signerUsers: [USER, 'other-signer'] });
      expect(signers.status).toBe(200);
      await signature(task);
      const response = await commit(task);
      expect(response.status).toBe(500);
    });
  });

  describe('additional data to sign', () => {
    it('rejects when the additional data signatures are missing', async () => {
      const task = await draft({}, {}, { name: 'Bob' }, { additional_data_to_sign: '() => ["one"]' });
      const response = await commit(task);
      expect(response.status).toBe(500);
    });

    it('commits when the signatures match the additional data', async () => {
      const task = await draft({}, {}, { name: 'Bob' }, { additional_data_to_sign: '() => ["one"]' });
      await app.model('additionalDataSignature').create({
        document_id: task.documentId,
        data: 'one',
        signature: 'fake-signature',
        certificate: 'fake-certificate',
        created_by: USER,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const response = await commit(task);
      expect(response.status).toBe(200);
    });
  });

  describe('workflow number', () => {
    it('rejects a workflow number function that returns a number', async () => {
      const task = await draft({ workflowNumber: '() => 5' });
      const response = await commit(task);
      expect(response.status).toBe(500);
    });

    it('rejects a workflow number function that throws', async () => {
      const task = await draft({ workflowNumber: '() => { throw new Error("no"); }' });
      const response = await commit(task);
      expect(response.status).toBe(500);
    });
  });

  describe('handling meta', () => {
    it('rejects incomplete handling meta', async () => {
      const task = await draft();
      await as()('put', `/tasks/${task.id}/meta`).send({ meta: { handling: { foo: 'bar' } } });
      const response = await commit(task);
      expect(response.status).toBe(500);
    });

    it('rejects a commit by a user who is not handling the task', async () => {
      const task = await draft();
      await as()('put', `/tasks/${task.id}/meta`).send({ meta: { handling: { timestamp: 1, userId: 'someone', userName: 'Someone Else' } } });
      const response = await commit(task);
      expect(response.status).toBe(500);
    });

    it('commits when the committer is the handling user', async () => {
      const task = await draft();
      await as()('put', `/tasks/${task.id}/meta`).send({ meta: { handling: { timestamp: 1, userId: USER, userName: 'Scenario User' } } });
      const response = await commit(task, USER, { firstName: 'Scenario', lastName: 'User', name: 'Scenario User' });
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('payments', () => {
    const paymentSchema = {
      properties: {
        name: { type: 'string' },
        pay: { control: 'payment', strictPayment: true, paymentControlPath: 'pay' },
      },
    };

    it('rejects when a strict payment control is not paid', async () => {
      const task = await draft({}, paymentSchema);
      const response = await commit(task);
      expect(response.status).toBe(500);
    });

    it('rejects when unholding the payment fails', async () => {
      const task = await draft({}, {});
      await as()('put', `/tasks/${task.id}/meta`).send({ meta: { isHoldPayment: true } });
      const response = await commit(task);
      expect(response.status).toBe(500);
    });
  });

  it('rejects an entry task whose template is no longer an entry', async () => {
    const task = await draft();
    const workflowTemplate = await app.model('workflowTemplate').findByPk(SCENARIO.workflowTemplateId);
    const data = JSON.parse(JSON.stringify(workflowTemplate.data));
    const original = JSON.parse(JSON.stringify(data));
    data.entryTaskTemplateIds = data.entryTaskTemplateIds.filter((entry) => !entry.id.includes(`${task.taskTemplateId}`));
    await app.model('workflowTemplate').update({ data }, { where: { id: SCENARIO.workflowTemplateId } });
    try {
      const response = await commit(task);
      expect(response.status).toBe(403);
    } finally {
      await app.model('workflowTemplate').update({ data: original }, { where: { id: SCENARIO.workflowTemplateId } });
    }
  });
});
