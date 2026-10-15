import AdmZip from 'adm-zip';

import { TestApp, TEST_AUTH_HEADER } from './test-app';

const AUTH_HEADER = TEST_AUTH_HEADER;
const DEFAULT_CONTAINER_ID = 1;

describe('Files Controller', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  describe('POST /files', () => {
    it('should require auth', async () => {
      await app.request().post('/files').expect(401);
    });

    it('should upload a file and store it directly in the DB (no active provider)', async () => {
      const response = await app
        .request()
        .post('/files')
        .query({ name: 'hello.txt', container_id: DEFAULT_CONTAINER_ID, description: 'A test file' })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/plain')
        .send('Hello, world!')
        .expect(200);

      expect(response.body.data).toMatchObject({ name: 'hello.txt', contentType: 'text/plain', description: 'A test file' });
      expect(response.body.data.id).toBeDefined();
    });

    it('should gracefully continue without a preview when the preview service is unreachable', async () => {
      const response = await app
        .request()
        .post('/files')
        .query({ name: 'image.png', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'image/png')
        .send(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
        .expect(200);

      expect(response.body.data).toMatchObject({ name: 'image.png', contentType: 'image/png' });

      const [, logData] = await app.log.waitForLog('preview-generating-error');
      expect(logData.error).toBeDefined();
    });

    it('should reject an empty file', async () => {
      await app
        .request()
        .post('/files')
        .query({ name: 'empty.txt', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/plain')
        .send('')
        .expect(400);
    });
  });

  describe('upload limits', () => {
    const OVER_LIMIT = 65536 + 1;

    it('should reject an oversized body on POST /files with 413', async () => {
      const response = await app
        .request()
        .post('/files')
        .query({ name: 'big.bin', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'application/octet-stream')
        .send(Buffer.alloc(OVER_LIMIT, 1))
        .expect(413);
      expect(response.body.error.message).toBe('Payload too large.');
    });

    it('should reject an oversized body on POST /files/uploadArchive with 413', async () => {
      await app
        .request()
        .post('/files/uploadArchive')
        .query({ container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'application/zip')
        .send(Buffer.alloc(OVER_LIMIT, 1))
        .expect(413);
    });

    const uploadZip = (zip: AdmZip) =>
      app
        .request()
        .post('/files/uploadArchive')
        .query({ container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'application/zip')
        .send(zip.toBuffer());

    it('should accept a small valid archive', async () => {
      const zip = new AdmZip();
      zip.addFile('a.txt', Buffer.from('hello archive, not highly compressible 1234567890'));
      const response = await uploadZip(zip).expect(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('should reject an archive with too many entries', async () => {
      const zip = new AdmZip();
      for (let i = 0; i < 1001; i++) zip.addFile(`f${i}.txt`, Buffer.from('x'));
      await uploadZip(zip).expect(413);
    });

    it('should reject an archive whose declared entry size is over the limit before decompressing', async () => {
      const zip = new AdmZip();
      zip.addFile('bomb.bin', Buffer.from('hello'));
      // Forge the declared uncompressed size in the central directory header.
      zip.getEntries()[0].header.size = 10 * 1024 * 1024;
      await uploadZip(zip).expect(413);
      const [, logData] = await app.log.waitForLog('archive-too-large');
      expect(logData.size).toBe(10 * 1024 * 1024);
    });

    it('should reject an archive with a too high compression ratio', async () => {
      const zip = new AdmZip();
      zip.addFile('zeros.bin', Buffer.alloc(30000, 0));
      await uploadZip(zip).expect(413);
    });
  });

  describe('GET /files/:id', () => {
    it('should download the uploaded file content', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app
        .request()
        .post('/files')
        .query({ name: 'download-me.txt', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/plain')
        .send('downloadable content')
        .expect(200);

      const response = await app.request().get(`/files/${id}`).set('Authorization', AUTH_HEADER).expect(200);

      expect(response.text).toBe('downloadable content');
    });

    it('should force attachment and nosniff for an empty name with text/html', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app
        .request()
        .post('/files')
        .query({ name: '', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/html')
        .send('<script>alert(1)</script>')
        .expect(200);

      const response = await app.request().get(`/files/${id}`).set('Authorization', AUTH_HEADER).expect(200);

      expect(response.headers['content-disposition']).toMatch(/^attachment; filename="file"/);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should return 404 for an unknown id', async () => {
      await app.request().get('/files/00000000-0000-0000-0000-000000000000').set('Authorization', AUTH_HEADER).expect(404);
    });
  });

  describe('GET /files/:id/info', () => {
    it('should return file metadata without its data', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app
        .request()
        .post('/files')
        .query({ name: 'info-me.txt', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/plain')
        .send('some content')
        .expect(200);

      const response = await app.request().get(`/files/${id}/info`).set('Authorization', AUTH_HEADER).expect(200);

      expect(response.body.data).toMatchObject({ id, name: 'info-me.txt' });
      expect(response.body.data.data).toBeUndefined();
    });
  });

  describe('PUT /files/:id', () => {
    it('should update file metadata', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app
        .request()
        .post('/files')
        .query({ name: 'before-update.txt', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/plain')
        .send('content')
        .expect(200);

      const response = await app
        .request()
        .put(`/files/${id}`)
        .set('Authorization', AUTH_HEADER)
        .send({ name: 'after-update.txt', description: 'Updated' })
        .expect(200);

      expect(response.body.data).toMatchObject({ id, name: 'after-update.txt', description: 'Updated' });
    });
  });

  describe('DELETE /files/:id', () => {
    it('should delete a file', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app
        .request()
        .post('/files')
        .query({ name: 'to-delete.txt', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/plain')
        .send('content')
        .expect(200);

      await app.request().delete(`/files/${id}`).set('Authorization', AUTH_HEADER).expect(200);
      await app.request().get(`/files/${id}`).set('Authorization', AUTH_HEADER).expect(404);
    });
  });

  describe('POST /files/:id/copy', () => {
    it('should copy a file', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app
        .request()
        .post('/files')
        .query({ name: 'to-copy.txt', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/plain')
        .send('copy me')
        .expect(200);

      const response = await app.request().post(`/files/${id}/copy`).set('Authorization', AUTH_HEADER).expect(200);

      expect(response.body.data.id).not.toBe(id);
      expect(response.body.data).toMatchObject({ name: 'to-copy.txt' });
    });
  });

  describe('ZIP and ASiC-E limits', () => {
    const upload = async (name: string, content: Buffer | string) => {
      const response = await app
        .request()
        .post('/files')
        .query({ name, container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'application/octet-stream')
        .send(content)
        .expect(200);
      return response.body.data.id as string;
    };
    const download = (ids: string) =>
      app
        .request()
        .get(`/files/${ids}/zip`)
        .set('Authorization', AUTH_HEADER)
        .buffer(true)
        .parse((res, cb) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });

    it('should collapse duplicate IDs in GET /files/:ids/zip', async () => {
      const id = await upload('dup.txt', 'duplicate me');
      const response = await download(`${id},${id}, ${id},`).expect(200);
      expect(new AdmZip(response.body).getEntries()).toHaveLength(1);
    });

    it('should reject more than the max number of IDs with 400', async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`).join(',');
      await download(ids).expect(400);
    });

    it('should reject a malformed ID with 400', async () => {
      await download('not-a-uuid').expect(400);
    });

    it('should reject a ZIP whose total size exceeds the limit with 413', async () => {
      const ids = [];
      for (let i = 0; i < 3; i++) ids.push(await upload(`big${i}.bin`, Buffer.alloc(60000, i + 1)));
      await download(ids.join(',')).expect(413);
    });

    it('should reject a non-array filesIds on POST /files/asice with 400', async () => {
      const manifestId = await upload('manifest.xml', '<a/>');
      await app.request().post('/files/asice').set('Authorization', AUTH_HEADER).send({ manifestFileId: manifestId, filesIds: 'abc' }).expect(400);
    });

    it('should reject an ASiC-E whose total size exceeds the limit with 413', async () => {
      const manifestId = await upload('manifest.xml', '<a/>');
      const ids = [];
      for (let i = 0; i < 3; i++) ids.push(await upload(`asice${i}.bin`, Buffer.alloc(60000, i + 1)));
      await app.request().post('/files/asice').set('Authorization', AUTH_HEADER).send({ manifestFileId: manifestId, filesIds: ids }).expect(413);
    });

    it('should build an ASiC-E for a normal request, ignoring duplicate IDs', async () => {
      const manifestId = await upload('manifest.xml', '<a/>');
      const id = await upload('doc.txt', 'doc');
      const response = await app
        .request()
        .post('/files/asice')
        .set('Authorization', AUTH_HEADER)
        .send({ manifestFileId: manifestId, filesIds: [id, id] })
        .buffer(true)
        .parse((res, cb) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        })
        .expect(200);
      const names = new AdmZip(response.body).getEntries().map((e) => e.entryName);
      expect(names.filter((n) => n === 'doc.txt')).toHaveLength(1);
    });
  });
});
