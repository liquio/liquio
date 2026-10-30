import { TestApp } from './test-app';
import { getDb } from '../src/lib/context';

describe('Seeders', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  it('default container seeder targets the migrated schema (the container already exists)', async () => {
    const seeder = require('../src/seeders/201903041636-default-container.js');
    // TestApp already seeded the default container, so only a unique violation proves the columns match the schema.
    await expect(seeder.up(getDb().getQueryInterface())).rejects.toMatchObject({ name: 'SequelizeUniqueConstraintError' });
  });
});
