import { TestApp } from './test-app';
import { prepareFixtures, TASK_FIXTURES, DOCUMENT_FIXTURES, WORKFLOW_FIXTURES } from './fixtures';

// Read endpoints against entities from the fixtures: tasks, documents and workflows
// as the performer of the fixture task ("test") and as an unrelated user.
describe('Fixture entities over HTTP', () => {
  let app: TestApp;

  const PERFORMER_ID = 'test';
  const task = TASK_FIXTURES[0];
  const document = DOCUMENT_FIXTURES.find((item) => item.id === task.document_id);
  const workflow = WORKFLOW_FIXTURES.find((item) => item.id === task.workflow_id);

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await prepareFixtures(app);
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

  const get = async (userId: string, path: string) => {
    const { jwt, payload } = app.generateUserToken(userId);
    app.nockId.get('/user/info').query({ access_token: payload.authTokens.accessToken }).once().reply(200, {
      userId,
      role: 'individual',
      services: {},
    });
    return app.request().get(path).set('token', jwt);
  };

  it.each([
    ['document', `/documents/${document?.id}`],
    ['workflow', `/workflows/${workflow?.id}`],
    ['workflow tasks', `/tasks?workflow_id=${workflow?.id}`],
  ])('performer reads %s', async (_name, path) => {
    const response = await get(PERFORMER_ID, path);
    expect(response.status).toBe(200);
  });
});
