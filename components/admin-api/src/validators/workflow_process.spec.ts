import { validationResult } from 'express-validator';

import { WorkflowProcessValidator } from './workflow_process';

describe('validators/workflow_process file ids', () => {
  const validator = new WorkflowProcessValidator({});

  const validate = async (schemaName: 'downloadFile' | 'downloadP7s', params: object) => {
    const req: any = { params, query: {}, body: {} };
    for (const chain of validator[schemaName]()) {
      await chain.run(req);
    }
    return validationResult(req);
  };

  describe.each(['downloadFile', 'downloadP7s'] as const)('%s', (schemaName) => {
    it.each(['3f6c26d0-4bf3-11ea-b53a-b9dbc2be6c8d', '12345', 'file_1-A'])('accepts fileId %p', async (fileId) => {
      const result = await validate(schemaName, { id: 'process-id', fileId });
      expect(result.isEmpty()).toBe(true);
    });

    it.each(['..', '../../admin', '..%2f..%2fadmin', '%2e%2e%2fadmin', 'a/b', 'a\\b', 'a?x=1', 'a#b', 'a.b', ' ', ''])(
      'rejects fileId %p',
      async (fileId) => {
        const result = await validate(schemaName, { id: 'process-id', fileId });
        expect(result.isEmpty()).toBe(false);
        expect(result.array().some((error: any) => (error.param ?? error.path) === 'fileId')).toBe(true);
      },
    );
  });
});

describe('validators/workflow_process filters.user_data', () => {
  const validator = new WorkflowProcessValidator({});

  const validate = async (query: object) => {
    const req: any = { params: {}, query, body: {} };
    for (const chain of validator.getAll()) {
      await chain.run(req);
    }
    return validationResult(req);
  };

  const hasUserDataError = (result: any) => result.array().some((error: any) => (error.param ?? error.path) === 'filters.user_data');

  it('accepts a plain string', async () => {
    expect(hasUserDataError(await validate({ filters: { user_data: '61efddaa351d6219eee09043' } }))).toBe(false);
  });

  it.each([[['a']], [{ a: 'b' }], ['x'.repeat(65)]])('rejects %p', async (value) => {
    expect(hasUserDataError(await validate({ filters: { user_data: value } }))).toBe(true);
  });
});
