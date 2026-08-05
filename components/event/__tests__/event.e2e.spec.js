const { TestApp } = require('./test-app');

describe('EventBusiness', () => {
  /**
   * @type {TestApp}
   */
  let app;

  beforeAll(async () => {
    await TestApp.beforeAll();

    app = await TestApp.setup();
    await app.init();
    
    // Note: fixtures are loaded from manager/data/test.e2e.sql
  });

  afterAll(async () => {
    await TestApp.afterAll(app);
  });

  afterEach(async () => {
    await TestApp.afterEach(app);
  });

  beforeEach(async () => {
    await TestApp.beforeEach(app);
  });

  it('should fail to process event with empty inputs', async () => {
    expect(await app.eventBusiness.createFromMessage()).toBe(true);

    expect(app.log.logs.find((log) => log.type === 'event-handling-by-message-from-queue-error')).toBeDefined();
    expect(app.log.logs.find((log) => log.type === 'unknown-error')).toBeDefined();

    app.log.clear();

    expect(await app.eventBusiness.createFromMessage({}));

    expect(app.log.logs.find((log) => log.type === 'event-handling-by-message-from-queue-error')).toBeDefined();
    expect(app.log.logs.find((log) => log.type === 'unknown-error')).toBeDefined();
  });
});
