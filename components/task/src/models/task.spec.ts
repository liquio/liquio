import { Op } from 'sequelize';

import { TaskModel } from './task';
import { setAppContext, resetAppContext } from '../lib/context';

describe('TaskModel.formOptionsToGetAllByUserId scope', () => {
  const USER = 'user-1';
  let model: any;

  beforeAll(() => {
    setAppContext({
      db: { define: () => ({ prototype: {} }) },
      models: {
        document: { model: {} },
        workflow: { model: {} },
        workflowTemplate: { model: {} },
        taskTemplate: { model: {} },
        documentTemplate: { model: {} },
      } as any,
      config: { modules: {} },
    });
    model = new TaskModel();
  });

  afterAll(() => {
    resetAppContext();
  });

  const build = (filters: any) => model.formOptionsToGetAllByUserId(USER, [1], [2], 1, 10, filters, {}, null, undefined, undefined);
  it.each([[{}], [{ assigned_to: ['me'] }], [{ assigned_to: { 0: 'me' } }], [{ assigned_to: ['unit'] }], [{ assigned_to: 'bogus' }]])(
    'applies the default user scope for %j',
    (filters) => {
      const opts = build(filters);
      expect(opts.filters[Op.and].some((c: any) => c[Op.or]?.some((x: any) => x.performer_users?.[Op.overlap]?.[0] === USER))).toBe(true);
      expect(opts.filters[Op.or]).toBeUndefined();
    },
  );

  it('keeps assigned_to=me as a performer/signer filter', () => {
    const opts = build({ assigned_to: 'me' });
    expect(opts.filters[Op.or]).toEqual([{ performer_users: { [Op.overlap]: [USER] } }, { signer_users: { [Op.overlap]: [USER] } }]);
  });

  it('keeps assigned_to=unit as a unit filter', () => {
    const opts = build({ assigned_to: 'unit' });
    expect(opts.filters[Op.or]).toBeUndefined();
    expect(opts.filters[Op.and][0][Op.or]).toEqual([
      { performer_units: { [Op.overlap]: [1] }, only_for_heads: false },
      { performer_units: { [Op.overlap]: [2] }, only_for_heads: true },
    ]);
  });

  it('does not treat array closed_by as me/unit', () => {
    const opts = build({ closed_by: ['me'] });
    expect(opts.filters.updated_by).toBeUndefined();
    expect(opts.filters.finished).toBe(true);
  });
});
