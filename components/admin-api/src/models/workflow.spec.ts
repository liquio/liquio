import { Sequelize } from 'sequelize';

import { WorkflowModel } from './workflow';

describe('models/workflow getAll user_data filter', () => {
  const db = new Sequelize('postgres://u:p@localhost:5432/db', { dialect: 'postgres', logging: false });
  let model: WorkflowModel;
  let captured: any;

  const run = async (filters: object) => {
    await model.getAll({ currentPage: 1, perPage: 10, attributes: undefined, filters, sort: [] });
    const qg: any = db.getQueryInterface().queryGenerator;
    return qg.selectQuery('workflows', { where: captured.filters, attributes: ['id'] }, model.model);
  };

  beforeAll(() => {
    (global as any).models = { workflowTemplate: { model: {} }, workflowTemplateCategory: { model: {} }, workflowError: { model: {} } };
    model = new WorkflowModel(db);
    (model.model as any).paginate = jest.fn(async (options) => {
      captured = options;
      return { data: [], pagination: {} };
    });
  });

  afterAll(async () => {
    await db.close();
  });

  const payloads = ["' OR 1=1 --", "\\' OR 1=1 --", "x' ; select pg_sleep(5) --"];

  it.each(payloads)('escapes payload %p through the postgres dialect', async (payload) => {
    const sql: string = await run({ user_data: payload });
    // Quotes are doubled, backslashes are kept literally: the payload stays inside one string literal.
    const escaped = `'${payload.replace(/'/g, "''")}'`;
    expect(sql).toContain(`workflow.user_data#>>'{userId}' = ${escaped}`);
  });

  it('keeps both is_draft and user_data filters', async () => {
    const sql: string = await run({ is_draft: true, user_data: 'abc' });
    expect(sql).toContain("workflow.data -> 'messages' is null");
    expect(sql).toContain("workflow.user_data#>>'{userId}' = 'abc'");
  });

  it('keeps is_not_draft, task_template_id and user_data filters together', async () => {
    const sql: string = await run({ is_not_draft: true, task_template_id: '5', user_data: 'abc' });
    expect(sql).toContain("workflow.data -> 'messages' is not null");
    expect(sql).toContain('t.task_template_id = 5');
    expect(sql).toContain("workflow.user_data#>>'{userId}' = 'abc'");
  });

  it('does not add a user_data condition when the filter is absent', async () => {
    const sql: string = await run({});
    expect(sql).not.toContain('user_data');
  });
});
