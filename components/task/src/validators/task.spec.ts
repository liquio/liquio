import { validationResult } from 'express-validator';

import { TaskValidator } from './task';

const run = async (method: 'getAll' | 'getUnreadTasksCount', query: Record<string, any>) => {
  const validator: any = new TaskValidator({})[method]();
  const req: any = { query, params: {}, body: {}, headers: {} };
  for (const chain of validator) {
    await chain.run(req);
  }
  return validationResult(req);
};

describe.each(['getAll', 'getUnreadTasksCount'] as const)('TaskValidator.%s', (method) => {
  it.each([
    ['assigned_to', 'me'],
    ['assigned_to', 'unit'],
    ['closed_by', 'me'],
    ['closed_by', 'unit'],
  ])('accepts filters.%s=%s', async (key, value) => {
    expect((await run(method, { filters: { [key]: value } })).isEmpty()).toBe(true);
  });

  it.each(['assigned_to', 'closed_by'])('rejects array and object forms of filters.%s', async (key) => {
    for (const value of [['me'], ['unit'], { 0: 'me' }, { a: 'me' }, 'other']) {
      const result = await run(method, { filters: { [key]: value } });
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some((e: any) => (e.path || e.param) === `filters.${key}`)).toBe(true);
    }
  });
});
