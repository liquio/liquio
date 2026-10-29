import { TestApp } from './test-app';
import { prepareFixtures, TASK_FIXTURES, DOCUMENT_FIXTURES } from './fixtures';

const READING_QUEUE = 'bpmn-task-incoming';
const PDF_QUEUE = 'bpmn-task-incoming-generating-pdf';
const DELAYED_QUEUE = `${READING_QUEUE}-delayed-auto-commit`;

describe('Task RabbitMQ consumers', () => {
  let app: TestApp;

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

  const logged = (name: string) => () => (global.log as any).getLogs().some((args) => args[0] === name);

  it('asserts the delayed auto commit queues and the consumers are subscribed', async () => {
    const channel = await app.getTestAmqpChannel();
    for (const queue of [READING_QUEUE, PDF_QUEUE, DELAYED_QUEUE, `${DELAYED_QUEUE}-1s`]) {
      await expect(channel.checkQueue(queue)).resolves.toBeDefined();
    }
  });

  it('createFromMessage creates a task from a queue message and acks it', async () => {
    const before = await app.model('task').count({ where: { task_template_id: 988191001 } });

    app.nockId.post('/user/info/id').reply(200, [{ userId: '61efddaa351d6219eee09043', role: 'individual', services: {} }]);

    await app.publishMessage(READING_QUEUE, {
      workflowTemplateId: 988191,
      taskTemplateId: 988191001,
      userId: '61efddaa351d6219eee09043',
      initData: {},
    });

    await app.waitFor(async () => (await app.model('task').count({ where: { task_template_id: 988191001 } })) > before);
    await app.waitFor(logged('message-from-queue-ack'));
  });

  it('createPdfFromMessage resets the file fields of the document when the pdf cannot be created', async () => {
    const documentId = DOCUMENT_FIXTURES[0].id;
    await app.model('document').update({ file_id: 'e2e-file-id', file_name: 'e2e.pdf', file_type: 'application/pdf' }, { where: { id: documentId } });

    await app.publishMessage(PDF_QUEUE, { documentId, userId: '61efddaa351d6219eee09043' });

    await app.waitFor(async () => {
      const document = await app.model('document').findByPk(documentId);
      return document.file_id === null;
    });
  });

  it('delayedAutoCommitFromMessage finishes the task', async () => {
    const taskId = TASK_FIXTURES[0].id;
    expect((await app.model('task').findByPk(taskId)).finished).toBe(false);

    await app.publishMessage(DELAYED_QUEUE, { taskId });

    await app.waitFor(async () => (await app.model('task').findByPk(taskId)).finished === true);
  });
});
