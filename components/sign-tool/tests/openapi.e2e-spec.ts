import * as fs from 'fs';
import * as path from 'path';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createE2eApp, setEnv } from './helpers/create-app';

const snapshotPath = path.join(__dirname, 'openapi.snapshot.json');

describe('OpenAPI (e2e)', () => {
  it('serves the docs UI and matches the snapshot', async () => {
    const app = await createE2eApp();
    try {
      await request(app.getHttpServer()).get('/api').expect(200);
      const res = await request(app.getHttpServer()).get('/api-json').expect(200);
      const doc = { ...res.body, info: { ...res.body.info, version: '<version>' } };
      if (process.env.UPDATE_OPENAPI_SNAPSHOT) {
        fs.writeFileSync(snapshotPath, JSON.stringify(doc, null, 2) + '\n');
      }
      expect(doc).toEqual(JSON.parse(fs.readFileSync(snapshotPath, 'utf8')));
    } finally {
      await app.close();
    }
  });

  it('does not serve /api-json when swagger is disabled', async () => {
    const restore = setEnv({
      LIQUIO_CFG_SIGN_TOOL_server: JSON.stringify({ host: '127.0.0.1', port: 0, acceptedBodySize: '64kb', isSwaggerEnabled: false }),
    });
    let app: INestApplication;
    try {
      app = await createE2eApp();
    } finally {
      restore();
    }
    try {
      await request(app.getHttpServer()).get('/api-json').expect(404);
    } finally {
      await app.close();
    }
  });
});
