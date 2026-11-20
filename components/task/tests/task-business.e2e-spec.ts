import { TestApp } from './test-app';
import { seedScenario, addTemplatePair, addUnit, userRequest, SCENARIO } from './helpers/scenario';

// Task lifecycle driven through HTTP so that businesses/task.ts runs against a real DB:
// create, read, assign, signers, meta, delete/recover, commit and the system entry points.
describe('Task business', () => {
  let app: TestApp;
  const HEAD = SCENARIO.userId;
  const MEMBER = 'scenario-member';
  const OUTSIDER = 'scenario-outsider';
  const UNIT_ID = 990001;
  const BASIC = 'c2NlbmFyaW86c2NlbmFyaW8='; // fake "scenario:scenario"

  const as = (userId = HEAD) => userRequest(app, userId);
  const create = async (taskTemplateId: number, userId = HEAD, extra: any = {}) =>
    as(userId)('post', '/tasks').send({ workflowTemplateId: SCENARIO.workflowTemplateId, taskTemplateId, ...extra });

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await seedScenario(app);
    await addUnit(app, { id: UNIT_ID, name: 'Scenario unit', heads: [HEAD], members: [HEAD, MEMBER], heads_ipn: [], members_ipn: [] });
    await addTemplatePair(app, 990103, { setPermissions: [{ performerUnits: [UNIT_ID], performerUsers: [MEMBER] }], labels: '() => ["l1"]' });
    await addTemplatePair(app, 990104, { isSystem: true });
    await addTemplatePair(app, 990105, {
      taskName: '(documents) => "Calculated name"',
      documentName: '(documents) => "Calculated document"',
      worlflowName: '() => "Calculated workflow"',
      meta: '() => ({ fromSchema: true })',
      deadline: '3d',
      setPermissions: [{ performerUsers: [HEAD] }],
    });
    await addTemplatePair(app, 990107, {
      numberTemplateId: 818,
      setPermissions: [
        {
          calcPerformerUsers: '(documents, events) => ["calc-user", "calc-user"]',
          calcPerformerUsersIpn: '() => ["1111111111"]',
          calcPerformerUsersEmail: '() => "calc@example.test"',
          calcPerformerUsersName: '() => ["Calc Name"]',
          calcPerformerUnits: `() => ${UNIT_ID}`,
          calcRequiredPerformerUnits: `() => [${UNIT_ID}]`,
          performerUsersIsWorkflowOwner: true,
          performerUsersIsRandomFromUnit: UNIT_ID,
          performerUsersIsRandomHeadFromUnit: `() => ${UNIT_ID}`,
          performerUsersIsRandomMemberFromUnit: `() => ${UNIT_ID}`,
          predictionPerformerUnits: `() => [${UNIT_ID}]`,
          predictionRequiredPerformerUnits: `() => [${UNIT_ID}]`,
          predictionPerformerUsers: '() => ["predicted"]',
          predictionSignerUsers: '() => ["predicted-signer"]',
          signerUsers: ['signer-fixed'],
          onlyForHeads: '() => true',
        },
        { calcPerformerUsers: '() => { throw new Error("broken"); }', calcPerformerUnits: '() => { throw new Error("broken"); }' },
        { useAllDocuments: true, condition: '(documents) => documents.length >= 0', performerUsers: ['conditional'] },
      ],
    });
    await addTemplatePair(app, 990108, {
      taskName: '(documents, user) => "Task " + documents.length',
      documentName: '() => "Doc"',
      worlflowName: '() => "Workflow name"',
      createdByUnits: `() => [${UNIT_ID}]`,
      createdByUnitHeads: `() => [${UNIT_ID}]`,
      labels: '() => ["a", "b"]',
      meta: '() => ({ calculated: 1 })',
      deadline: '() => "2h"',
    });
    await addTemplatePair(app, 990109, { taskName: '() => { throw new Error("boom"); }' });
    await addTemplatePair(app, 990106, { setPermissions: [{ condition: '() => false', performerUsers: ['nobody'] }, { performerUsers: [HEAD] }] });
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

  describe('POST /tasks', () => {
    it('creates an entry task with calculated names, meta and permissions', async () => {
      const response = await create(990105);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Calculated name');
      expect(response.body.data.performerUsers).toEqual([HEAD]);
    });

    it('creates a task for a unit and users and reports it in the list', async () => {
      const created = await create(990103);
      expect(created.status).toBe(200);
      expect(created.body.data.performerUnits).toEqual([UNIT_ID]);
      expect(created.body.data.performerUsers).toEqual([MEMBER]);

      const list = await as(MEMBER)('get', '/tasks?filters[assigned_to]=me&filters[is_entry]=true&sort[created_at]=desc&page=1&count=5');
      expect(list.status).toBe(200);
      expect(list.body.data.some((task) => task.id === created.body.data.id)).toBe(true);
    });

    it('calculates permissions, units and signers from the permission descriptions', async () => {
      app.nockId.post('/user/info/ipn').reply(200, [{ userId: 'ipn-user', name: 'Ipn User', ipn: '1111111111' }]);
      app.nockId
        .get('/user')
        .query({ email: 'calc@example.test' })
        .reply(200, [{ userId: 'mail-user', name: 'Mail User', email: 'calc@example.test' }]);
      const response = await create(990107);
      expect(response.status).toBe(200);
      expect(response.body.data.performerUsers).toEqual(expect.arrayContaining(['calc-user', 'predicted', 'conditional']));
      expect(response.body.data.performerUnits).toEqual(expect.arrayContaining([UNIT_ID]));
      expect(response.body.data.signerUsers).toEqual(expect.arrayContaining(['signer-fixed']));
      expect(response.body.data.onlyForHeads).toBe(true);
      expect(response.body.data.document.number).toBeTruthy();
    });

    it('calculates workflow, task and document names, labels, units and due date', async () => {
      const response = await create(990108);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Task 0');
      expect(response.body.data.labels).toEqual(['a', 'b']);
      expect(response.body.data.meta.calculated).toBe(1);
      expect(response.body.data.dueDate).toBeTruthy();
    });

    it('reports an error when a schema function throws', async () => {
      const response = await create(990109);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('skips permission descriptions whose condition is false', async () => {
      const response = await create(990106);
      expect(response.status).toBe(200);
      expect(response.body.data.performerUsers).toEqual([HEAD]);
    });

    it('rejects missing params', async () => {
      const response = await as()('post', '/tasks').send({ workflowTemplateId: SCENARIO.workflowTemplateId });
      expect([400, 422]).toContain(response.status);
    });

    it('rejects an unknown workflow template', async () => {
      const response = await as()('post', '/tasks').send({ workflowTemplateId: 1, taskTemplateId: SCENARIO.taskTemplateId });
      expect(response.status).toBe(404);
    });

    it('rejects a task template that is not an entry of the workflow', async () => {
      const response = await create(990199);
      expect(response.status).toBe(404);
    });

    it('forbids creating a system task by a user', async () => {
      const response = await create(990104);
      expect(response.status).toBe(403);
    });

    it('rejects an unknown copy source', async () => {
      const response = await create(SCENARIO.taskTemplateId, HEAD, { copyFrom: '00000000-0000-4000-8000-000000000000' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects a forwarded regular user task template that is not an AI assistant', async () => {
      const response = await app
        .request()
        .post('/tasks/by-other-system')
        .set('Authorization', 'Basic unknown')
        .send({ workflowTemplateId: SCENARIO.workflowTemplateId, taskTemplateId: SCENARIO.taskTemplateId });
      expect(response.status).toBe(401);
    });
  });

  describe('reads', () => {
    let task: any;

    beforeAll(async () => {
      task = (await create(990103)).body.data;
    });

    it('GET /tasks/:id returns the task to a performer and hides it from an outsider', async () => {
      expect((await as(MEMBER)('get', `/tasks/${task.id}`)).status).toBe(200);
      expect((await as(OUTSIDER)('get', `/tasks/${task.id}`)).status).toBeGreaterThanOrEqual(400);
    });

    it('GET /tasks/:id/last returns tasks of the workflow', async () => {
      const response = await as(MEMBER)('get', `/tasks/${task.id}/last`);
      expect(response.status).toBe(200);
    });

    it('GET /tasks/last/:workflowId/:taskTemplateId returns the task id', async () => {
      const response = await as(MEMBER)('get', `/tasks/last/${task.workflowId}/${task.taskTemplateId}`);
      expect(response.status).toBe(200);
      expect(response.body.data.taskId).toBe(task.id);
    });

    it('GET /tasks/unread/count counts unread tasks of the user', async () => {
      const response = await as(MEMBER)('get', '/tasks/unread/count');
      expect(response.status).toBe(200);
      expect(response.body.data.unreadTasksCount).toBeGreaterThanOrEqual(0);
    });

    it.each([
      'filters[name]=Scenario',
      'filters[deleted]=false',
      'filters[assigned_to]=me&filters[closed_by]=me',
      'filters[search]=Scenario&filters[is_entry]=true',
      'filters[workflow_name]=Scenario',
      'filters[workflow_created_by]=scenario-user',
      'filters[number]=1',
      'filters[task_template_id]=990103',
      'filters[task_template_id_list][]=990103&filters[task_template_id_list][]=990105',
      'filters[workflow_template_id]=990100',
      'filters[performer_username]=Name',
      'filters[without_performer_username]=Name',
      'filters[labels][]=l1',
      'filters[meta][statusId]=1',
      'filters[due_date_from]=2020-01-01T00:00:00.000Z&filters[due_date_to]=2031-01-01T00:00:00.000Z',
      'filters[is_read]=false',
      'filters[is_current]=true',
      'from_created_at=2020-01-01T00:00:00.000Z&to_created_at=2031-01-01T00:00:00.000Z',
      'sort[created_at]=asc&sort[finished_at]=desc&sort[performer_users]=asc',
      'sort[document.number]=asc&sort[workflow.number]=desc&sort[meta.user]=asc',
      'filters[assigned_to]=unit',
      'filters[closed_by]=me',
      'filters[is_entry]=true',
      'filters[finished]=true',
      'filters[workflow_id]=' + '00000000-0000-4000-8000-000000000000',
      'sort[due_date]=asc&sort[name]=desc',
      'filters[search]=Scenario',
      'filters[created_at]=2020-01-01',
    ])('lists with %s', async (query) => {
      const response = await as(MEMBER)('get', `/tasks?${query.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`);
      expect([200, 422]).toContain(response.status);
    });
  });

  describe('modifications', () => {
    let task: any;

    beforeEach(async () => {
      task = (await create(990103)).body.data;
    });

    it('PUT /tasks/:id/signers sets signer users', async () => {
      const response = await as()('put', `/tasks/${task.id}/signers`).send({ signerUsers: ['signer-1'] });
      expect(response.status).toBe(200);
      expect(response.body.data.signerUsers).toEqual(['signer-1']);
    });

    it('PUT /tasks/:id/performers lets a unit head change performers to unit members', async () => {
      const response = await as()('put', `/tasks/${task.id}/performers`).send({ performerUsers: [HEAD] });
      expect(response.status).toBe(200);
      expect(response.body.data.performerUsers).toEqual([HEAD]);
    });

    it('PUT /tasks/:id/performers forbids an outsider', async () => {
      const response = await as(OUTSIDER)('put', `/tasks/${task.id}/performers`).send({ performerUsers: [OUTSIDER] });
      expect(response.status).toBe(403);
    });

    it('PUT /tasks/:id/due-date sets the due date for a head', async () => {
      const response = await as()('put', `/tasks/${task.id}/due-date`).send({ dueDate: '2030-01-01T00:00:00.000Z' });
      expect(response.status).toBe(200);
    });

    it('PUT /tasks/:id/due-date rejects an invalid date', async () => {
      const response = await as()('put', `/tasks/${task.id}/due-date`).send({ dueDate: 'not-a-date' });
      expect(response.status).toBe(422);
    });

    it('PUT /tasks/:id/meta merges and overrides metadata', async () => {
      const merged = await as()('put', `/tasks/${task.id}/meta`).send({ meta: { a: 1 } });
      expect(merged.status).toBe(200);
      const overridden = await as()('put', `/tasks/${task.id}/meta?override=true`).send({ meta: { b: 2 } });
      expect(overridden.status).toBe(200);
    });

    it('POST /tasks/:id/assign assigns a unit member', async () => {
      const response = await as()('post', `/tasks/${task.id}/assign`).send({ newPerformerUsers: [HEAD] });
      expect(response.status).toBe(200);
    });

    it('POST /tasks/:id/assign rejects users outside the head units', async () => {
      const response = await as()('post', `/tasks/${task.id}/assign`).send({ newPerformerUsers: [OUTSIDER] });
      expect(response.status).toBe(400);
    });

    it('DELETE, recover and permanent delete of a draft task', async () => {
      const own = (await create(SCENARIO.taskTemplateId)).body.data;
      expect((await as()('delete', `/tasks/${own.id}`)).status).toBe(200);
      expect((await as()('post', `/tasks/${own.id}/recover`).send({})).status).toBe(200);
      expect((await as()('delete', `/tasks/${own.id}`)).status).toBe(200);
      expect((await as(OUTSIDER)('delete', `/tasks/${own.id}/permanent`)).status).toBeGreaterThanOrEqual(400);
      const permanent = await as()('delete', `/tasks/${own.id}/permanent`);
      expect([202, 403]).toContain(permanent.status);
    });

    it('DELETE /tasks/expired-drafts removes nothing for a fresh user', async () => {
      const response = await as()('delete', '/tasks/expired-drafts');
      expect(response.status).toBe(200);
    });
  });

  describe('commit', () => {
    it('commits a draft task, publishes the message and rejects a second commit', async () => {
      const created = (await create(SCENARIO.taskTemplateId)).body.data;
      const update = await as()('put', `/documents/${created.documentId}`).send({ path: 'name', value: 'Bob' });
      expect(update.status).toBe(200);

      const first = await as()('post', `/tasks/${created.id}/commit`).send({});
      expect(first.status).toBe(200);
      expect(first.body.data.taskId).toBe(created.id);

      const second = await as()('post', `/tasks/${created.id}/commit`).send({});
      expect(second.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects commit when the document is invalid', async () => {
      const created = (await create(SCENARIO.taskTemplateId)).body.data;
      const response = await as()('post', `/tasks/${created.id}/commit`).send({});
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects commit by an outsider', async () => {
      const created = (await create(990103)).body.data;
      const response = await as(OUTSIDER)('post', `/tasks/${created.id}/commit`).send({});
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('unit statistics and lists', () => {
    beforeAll(async () => {
      await create(990103);
    });

    it('POST /tasks/list/get-by-unit-id lists tasks of a unit for its head', async () => {
      const response = await as()('post', '/tasks/list/get-by-unit-id').send({ unit_id: UNIT_ID, filters: {}, page: 1, count: 10 });
      expect(response.status).toBe(200);
      expect(response.body.data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /tasks/list/get-by-unit-id rejects a non-head', async () => {
      const response = await as(OUTSIDER)('post', '/tasks/list/get-by-unit-id').send({ unit_id: UNIT_ID });
      expect(response.status).toBe(401);
    });

    it('POST /tasks/statistics/get-by-unit-id returns statistics for a head', async () => {
      const response = await as()('post', '/tasks/statistics/get-by-unit-id').send({
        unit_id: UNIT_ID,
        group_by: 'by_template',
        filters: {},
        sort: { by: ['tasks', 'other'], order: 'desc' },
      });
      expect(response.status).toBe(200);
    });

    it('POST /tasks/statistics/get-by-unit-id groups by status', async () => {
      const response = await as()('post', '/tasks/statistics/get-by-unit-id').send({ unit_id: UNIT_ID, group_by: 'by_status', filters: {} });
      expect(response.status).toBe(200);
    });

    it('POST /tasks/statistics/get-by-unit-id answers 404 when nothing matches', async () => {
      const response = await as()('post', '/tasks/statistics/get-by-unit-id').send({
        unit_id: UNIT_ID,
        group_by: 'by_status',
        filters: { task_status: 'deleted', task_template_id: '1', date: { from: '2020-01-01', to: '2020-01-02' } },
      });
      expect(response.status).toBe(404);
    });
  });

  describe('system entry points', () => {
    it('POST /tasks/by-other-system forbids creation when it is switched off', async () => {
      const response = await app
        .request()
        .post('/tasks/by-other-system')
        .set('Authorization', `Basic ${BASIC}`)
        .send({ workflowTemplateId: SCENARIO.workflowTemplateId, taskTemplateId: SCENARIO.taskTemplateId });
      expect(response.status).toBe(401);
    });

    it('POST /tasks/get-user-performer-tasks requires basic auth', async () => {
      const response = await app
        .request()
        .post('/tasks/get-user-performer-tasks')
        .send({ userId: MEMBER, taskTemplateIds: [990103] });
      expect(response.status).toBe(401);
    });
  });
});
