import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createE2eApp, setConfig } from './helpers/create-app';

const SNAPSHOT = join(__dirname, 'openapi.snapshot.json');

describe('OpenAPI (e2e)', () => {
  let app: INestApplication | undefined;
  let restore: (() => void) | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    restore?.();
    restore = undefined;
  });

  it('matches the committed snapshot when swagger is enabled', async () => {
    restore = setConfig({ server: { port: 0, isSwaggerEnabled: true } });
    app = await createE2eApp();
    await request(app.getHttpServer()).get('/api').expect(200);
    const res = await request(app.getHttpServer()).get('/api-json').expect(200);
    const doc = { ...res.body, info: { ...res.body.info, version: '<version>' } };

    if (process.env.UPDATE_OPENAPI_SNAPSHOT === '1') {
      writeFileSync(SNAPSHOT, JSON.stringify(doc, null, 2) + '\n');
    }
    expect(doc).toEqual(JSON.parse(readFileSync(SNAPSHOT, 'utf-8')));
  });

  it('serves no api-json with the default config', async () => {
    app = await createE2eApp();
    await request(app.getHttpServer()).get('/api-json').expect(404);
  });
});
