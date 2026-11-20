import { matchedData, validationResult } from 'express-validator';

import Validators from './index';
import ExportValidator from './export';
import RecordsValidator from './records';
import KeysValidator from './keys';
import RegistersValidator from './registers';
import AccessLogValidator from './access_log';
import CustomValidator from './custom';
import ImportValidator from './import';
import RollbackValidator from './rollback';

const config = {};

const mockReq = (parts: { body?: any; query?: any; params?: any } = {}): any => ({
  body: {},
  query: {},
  params: {},
  headers: {},
  cookies: {},
  ...parts,
});

const run = async (chains: any[], req: any) => {
  for (const chain of chains) {
    await chain.run(req);
  }
  return validationResult(req);
};

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('express-validator integration', () => {
  describe('validation result handler', () => {
    it('responds with the configured status and error objects on invalid input', async () => {
      const req = mockReq({ body: { keyId: 'abc' } });
      await run(new ExportValidator(config).startPreparingToExport(), req);
      const res = mockRes();
      const next = jest.fn();

      await Validators.prototype.getValidationResultHandler.call(null, 422)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ type: 'field', value: 'abc', msg: 'Invalid value', path: 'keyId', location: 'body' }],
      });
    });

    it('supports custom status code', async () => {
      const req = mockReq({ params: {} });
      await run(new ImportValidator(config).getImportStatusWithDetails(), req);
      const res = mockRes();
      await Validators.prototype.getValidationResultHandler.call(null, 400)(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('calls next on valid input', async () => {
      const req = mockReq({ body: { keyId: '5' } });
      await run(new ExportValidator(config).startPreparingToExport(), req);
      const res = mockRes();
      const next = jest.fn();
      await Validators.prototype.getValidationResultHandler.call(null)(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('export', () => {
    const chains = () => new ExportValidator(config).startPreparingToExport();

    it('sanitizes keyId and leaves a missing options out of matched data (controller applies its default)', async () => {
      const req = mockReq({ body: { keyId: '7' } });
      const result = await run(chains(), req);
      expect(result.isEmpty()).toBe(true);
      expect(matchedData(req, { locations: ['body'] })).toEqual({ keyId: 7 });
    });

    it('accepts an options object', async () => {
      const req = mockReq({ body: { keyId: 1, options: { onlySchema: true } } });
      const result = await run(chains(), req);
      expect(result.isEmpty()).toBe(true);
      expect(matchedData(req, { locations: ['body'] }).options).toEqual({ onlySchema: true });
    });

    it.each([[[]], ['str'], [5]])('rejects non-object options %p', async (options) => {
      const req = mockReq({ body: { keyId: 1, options } });
      const result = await run(chains(), req);
      expect(result.array().map((e: any) => e.path)).toEqual(['options']);
    });
  });

  describe('records', () => {
    const v = new RecordsValidator(config);

    it('bulkCreateByPerson requires person object and records array', async () => {
      const bad = mockReq({ body: { registerId: 1, keyId: 2, recordsData: {}, person: [] } });
      const result = await run(v.bulkCreateByPerson(), bad);
      expect(
        result
          .array()
          .map((e: any) => e.path)
          .sort(),
      ).toEqual(['person', 'recordsData']);

      const nullPerson = mockReq({ body: { registerId: 1, keyId: 2, recordsData: [], person: null } });
      expect((await run(v.bulkCreateByPerson(), nullPerson)).array().map((e: any) => e.path)).toEqual(['person']);

      const ok = mockReq({ body: { registerId: '1', keyId: '2', recordsData: [], person: { id: 1 }, isDisableHooks: 'true' } });
      expect((await run(v.bulkCreateByPerson(), ok)).isEmpty()).toBe(true);
      expect(ok.body.registerId).toBe(1);
    });

    it('rawSequelizeParams is optional but must be an object when provided', async () => {
      const chains = v.getAllByPost();
      const missing = mockReq({ body: {} });
      expect((await run(chains, missing)).isEmpty()).toBe(true);

      const object = mockReq({ body: { rawSequelizeParams: { where: {} } } });
      expect((await run(chains, object)).isEmpty()).toBe(true);

      const array = mockReq({ body: { rawSequelizeParams: [] } });
      const result = await run(chains, array);
      expect(result.array().map((e: any) => e.path)).toEqual(['rawSequelizeParams']);
    });

    it('list sanitizes query ints/booleans and rejects invalid ones', async () => {
      const chains = v.getAll();
      const req = mockReq({ query: { offset: '5', limit: '10', no_limit: 'true', data: 'x' } });
      expect((await run(chains, req)).isEmpty()).toBe(true);
      expect(matchedData(req, { locations: ['query'] })).toMatchObject({ offset: 5, limit: 10, no_limit: true, data: 'x' });

      const bad = mockReq({ query: { offset: 'a' } });
      expect((await run(chains, bad)).array()).toEqual([{ type: 'field', value: 'a', msg: 'Invalid value', path: 'offset', location: 'query' }]);
    });

    it('create validates required fields and optional id', async () => {
      const bad = mockReq({ body: { id: 5, registerId: 'x', keyId: 1 } });
      const paths = (await run(v.create(), bad)).array().map((e: any) => e.path);
      expect(paths).toContain('registerId');

      const ok = mockReq({ body: { registerId: '1', keyId: '2', data: { a: 1 } } });
      expect((await run(v.create(), ok)).isEmpty()).toBe(true);
      expect(matchedData(ok, { locations: ['body'] })).toEqual({ registerId: 1, keyId: 2, data: { a: 1 } });
    });

    it('atu bulk delete nested optional key validates keyIds.possible', async () => {
      const chains = v.atuBulkDelete();
      const bad = mockReq({ body: { keyIds: { possible: 'x' } } });
      expect((await run(chains, bad)).array().map((e: any) => e.path)).toContain('keyIds.possible');
    });
  });

  describe('keys', () => {
    const v = new KeysValidator(config);

    it('list sanitizes query', async () => {
      const req = mockReq({ query: { offset: '1', register_id: '3', is_encrypted: 'true' } });
      expect((await run(v.getAll(), req)).isEmpty()).toBe(true);
      expect(matchedData(req, { locations: ['query'] })).toMatchObject({ offset: 1, register_id: 3 });
    });

    it('rejects invalid access_mode on create', async () => {
      const chains = (v as any).create();
      const req = mockReq({ body: { registerId: 1, access_mode: 'bogus' } });
      const errors = (await run(chains, req)).array() as any[];
      expect(errors.find((e) => e.path === 'access_mode')).toMatchObject({
        type: 'field',
        location: 'body',
        value: 'bogus',
      });
    });
  });

  describe('registers', () => {
    it('list rejects non-integer id', async () => {
      const v: any = new RegistersValidator(config);
      const req = mockReq({ query: { id: 'x', limit: '2' } });
      const result = await run(v.getAll(), req);
      expect(result.array().map((e: any) => e.path)).toEqual(['id']);
    });
  });

  describe('access log', () => {
    it('matchedData returns only validated query fields', async () => {
      const v: any = new AccessLogValidator(config);
      const req = mockReq({ query: { limit: '3', key_id: '9', unknown: 'x' } });
      const result = await run(v.getAll(), req);
      expect(result.isEmpty()).toBe(true);
      expect(matchedData(req, { locations: ['query'] })).toEqual({ limit: 3, key_id: 9 });
    });
  });

  describe('custom', () => {
    it('getPostCode requires string params', async () => {
      const v = new CustomValidator(config);
      const bad = mockReq({ query: { regionName: 'a' } });
      const paths = (await run(v.getPostCode(), bad)).array().map((e: any) => e.path);
      expect(paths).toEqual(['districtName', 'cityName', 'streetName', 'buildingNumber']);

      const ok = mockReq({
        query: { regionName: 'a', districtName: 'b', cityName: 'c', streetName: 'd', buildingNumber: '1' },
      });
      expect((await run(v.getPostCode(), ok)).isEmpty()).toBe(true);
      expect(matchedData(ok, { locations: ['query'] })).toEqual(ok.query);
    });
  });

  describe('import and rollback', () => {
    it('matchedData returns param ids', async () => {
      const imp = mockReq({ params: { importId: 'abc', extra: 'z' } });
      await run(new ImportValidator(config).getImportStatusWithDetails(), imp);
      expect(matchedData(imp, { locations: ['params'] })).toEqual({ importId: 'abc' });

      const rb = mockReq({ params: { rollbackId: 'r1' } });
      await run(new RollbackValidator(config).getRollbackStatusWithDetails(), rb);
      expect(matchedData(rb, { locations: ['params'] })).toEqual({ rollbackId: 'r1' });
    });

    it('rollback start requires keyId int and timePoint string', async () => {
      const v: any = new RollbackValidator(config);
      const start = v.startRollback();
      const req = mockReq({ body: { keyId: 'x', timePoint: 5 } });
      const paths = (await run(start, req)).array().map((e: any) => e.path);
      expect(paths).toEqual(['keyId', 'timePoint']);
    });
  });
});
