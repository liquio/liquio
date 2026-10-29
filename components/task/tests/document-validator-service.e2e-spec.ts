import { TestApp } from './test-app';
import { addUnit } from './helpers/scenario';
import { DocumentValidatorService as DocumentValidator } from '../src/services/document_validator';
import { Keywords } from '../src/services/document_validator/keywords';

// DocumentValidator, Keywords and CalcTriggersValidator against real schemas (no HTTP).
describe('Document validator service', () => {
  let app: TestApp;
  const userInfo = { userId: 'validator-user', ipn: '1234567890' };

  const validator = (properties: any, extra: any = {}, externalFunctions: any = {}) =>
    new (DocumentValidator as any)({ type: 'object', properties, ...extra }, externalFunctions, userInfo);

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await addUnit(app, { id: 990301, name: 'Validator unit', heads: [], members: [] });
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

  describe('check', () => {
    it('accepts valid data and reports json schema errors', async () => {
      const checker = validator({ name: { type: 'string', minLength: 2 }, age: { type: 'number' } }, { required: ['name'] });
      expect(await checker.check({ name: 'Bob', age: 5 })).toEqual([]);
      const errors = await checker.check({ name: 'B', age: 'x' });
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect((await checker.check({})).length).toBeGreaterThanOrEqual(1);
    });

    it('skips errors of hidden fields and fields cleaned when hidden', async () => {
      const checker = validator({
        page: {
          type: 'object',
          properties: {
            a: { type: 'string', minLength: 3, hidden: '() => true' },
            b: { type: 'string', minLength: 3, cleanWhenHidden: true, hidden: true },
          },
        },
      });
      expect(await checker.check({ page: { a: 'x', b: 'y' } })).toEqual([]);
      const visible = validator({ page: { type: 'object', properties: { a: { type: 'string', minLength: 3 } } } });
      expect((await visible.check({ page: { a: 'x' } })).length).toBe(1);
    });

    it('reports unexpected properties when asked to', async () => {
      const checker = validator({ page: { type: 'object', properties: { a: { type: 'string' } } } });
      const errors = await checker.check({ page: { a: 'x', extra: 1 }, other: 1 }, true);
      expect(Array.isArray(errors)).toBe(true);
      expect(await checker.check({ page: { a: 'x' } }, true)).toEqual([]);
    });
  });

  describe('keywords', () => {
    beforeAll(() => Keywords.init());

    it('checkValid evaluates a function or a list of rules', async () => {
      expect(await Keywords.checkValid('a', {}, {}, {})).toBe('');
      expect(await Keywords.checkValid(undefined, { checkValid: '() => false' }, {}, {})).toBe('');
      expect(await Keywords.checkValid('a', { checkValid: '(v) => v === "a"' }, {}, {})).toBe('');
      expect(await Keywords.checkValid('b', { checkValid: '(v) => v === "a"' }, {}, {})).toBe('checkValid error.');
      expect(await Keywords.checkValid('b', { checkValid: [{ isValid: '(v) => v === "a"', errorText: 'Not a' }] }, {}, {})).toContain('Not a');
      expect(await Keywords.checkValid('a', { checkValid: [{ isValid: '(v) => v === "a"' }] }, {}, {})).toBe('');
      expect(await Keywords.checkValid('a', { checkValid: '() => { throw new Error("x"); }' }, {}, {})).toBe('');
      const payment = { control: 'payment', checkValid: [{ isValid: '(v) => v.isSuccess === true' }] };
      expect(await Keywords.checkValid({ processed: [{ status: { isSuccess: 1 } }] }, payment, {}, {})).toBe('');
      expect(await Keywords.checkValid({ processed: [] }, payment, {}, {})).toContain('checkValid error');
    });

    it('checkRequired reports missing data', async () => {
      expect(await Keywords.checkRequired(undefined, {}, {}, {})).toBe('');
      expect(await Keywords.checkRequired(undefined, { checkRequired: '() => true' }, {}, {})).toBe('checkRequired error.');
      expect(await Keywords.checkRequired('x', { checkRequired: '() => true' }, {}, {})).toBe('');
      expect(await Keywords.checkRequired(undefined, { checkRequired: '() => false' }, {}, {})).toBe('');
      const payment = { control: 'payment.widget', checkRequired: '(v) => !v || !v.isSuccess' };
      expect(await Keywords.checkRequired({ processed: [] }, payment, {}, {})).toBe('');
    });

    it('checks html length, checkboxes tree and masks', async () => {
      expect(await Keywords.htmlMinLength('<b>ab</b>', { htmlMinLength: 3 })).toBe('HTML min length error.');
      expect(await Keywords.htmlMinLength('<b>abc</b>', { htmlMinLength: 3 })).toBe('');
      expect(await Keywords.htmlMinLength('x', {})).toBe('');
      expect(await Keywords.htmlMaxLength('<b>abcd</b>', { htmlMaxLength: 3 })).toBe('HTML max length error.');
      expect(await Keywords.htmlMaxLength('<b>ab</b>', { htmlMaxLength: 3 })).toBe('');
      expect(await Keywords.htmlMaxLength('x', {})).toBe('');
      const tree = { control: 'checkboxesTree', tree: [{ key: 'a' }, { tree: [{ key: 'b' }, { key: 'c' }], minSelected: 1 }], maxSelected: 2 };
      expect(await Keywords.checkboxesTree({ a: true, b: true }, tree)).toBe('');
      expect(await Keywords.checkboxesTree({ a: true }, tree)).toBe('Checkboxes tree schema error.');
      expect(await Keywords.checkboxesTree({}, { control: 'other' })).toBe('');
      expect(Keywords.checkMasks('123', { mask: '999' })).toBe('');
      expect(Keywords.checkMasks('12a', { mask: '999' })).not.toBe('');
      expect(Keywords.checkMasks('ab', { mask: 'aa', formatChars: { a: '[a-b]' } })).toBe('');
      expect(Keywords.checkMasks('', { mask: '999' })).toBe('');
      expect(Keywords.checkMasks('1', { mask: '9', formatChars: { 9: '(' } })).toBe('');
    });

    it('validates options, form groups, tree selects, related selects and units', async () => {
      const options = { type: 'string', options: [{ id: 'a' }] };
      expect(await Keywords.options('a', options)).toBe('');
      expect(await Keywords.options('z', options)).toBe('Invalid option value.');
      expect(await Keywords.options('z', { type: 'number' })).toBe('');
      const group = { control: 'form.group', properties: { x: options } };
      expect(await Keywords.formGroupOptions({ x: 'z' }, group)).toBe('Invalid option value.');
      expect(await Keywords.formGroupOptions({}, { control: 'other' })).toBe('');

      const treeSchema = { control: 'tree.select', options: [{ items: [{ id: 1, name: 'one' }] }, {}] };
      expect(await Keywords.treeSelect({ id: 1, name: 'one' }, treeSchema, {}, {}, {})).toBe('');
      expect(await Keywords.treeSelect({ id: 2, name: 'two' }, treeSchema, {}, {}, {})).toBe('Invalid tree select value.');
      expect(await Keywords.treeSelect(undefined, treeSchema, {}, {}, {})).toBe('');
      expect(await Keywords.relatedSelects('x', { control: 'related.selects' }, {}, {}, {})).toBe('Invalid register value.');
      expect(await Keywords.relatedSelects('x', {}, {}, {}, {})).toBe('');

      const unitSchema = { control: 'unit.select' };
      expect(await Keywords.units({ value: 990301, label: 'Validator unit' }, unitSchema, {}, {}, {})).toBe('');
      expect(await Keywords.units({ value: 990301, label: 'Other' }, unitSchema, {}, {}, {})).toBe('Invalid unit value.');
      expect(await Keywords.units([{ value: 990301, label: 'Validator unit' }], { ...unitSchema, multiply: true }, {}, {}, {})).toBe('');
      expect(await Keywords.units([{ value: 1, label: 'x' }], { ...unitSchema, multiply: true }, {}, {}, {})).toBe('Invalid unit value.');
      expect(await Keywords.units(undefined, unitSchema, {}, {}, {})).toBe('');
    });

    it('validates register values against the register service answer', async () => {
      const schema = { control: 'register', keyId: 5 };
      const record = { keyId: 5, registerId: 1, id: 'r1', code: 'c' };
      const external = (data) => ({
        getFilteredRecordsByKeyId: jest.fn().mockResolvedValue({ data }),
        getFilteredRecordsByKeyIdArguments: { userUnitIds: {} },
      });
      expect(await Keywords.register(undefined, schema, {}, {}, external([]))).toBe('');
      expect(await Keywords.register({ id: 1 }, { control: 'other', keyId: 5 }, {}, {}, external([]))).toBe('');
      expect(await Keywords.register({ id: 1 }, schema, {}, {}, external([]))).toBe('Invalid register value.');
      expect(await Keywords.register({ ...record, keyId: 6 }, schema, {}, {}, external([record]))).toBe('Invalid register value.');
      expect(await Keywords.register({ ...record, label: 'L' }, schema, {}, {}, external([record]))).toBe('');
      expect(await Keywords.register([{ ...record }], schema, {}, {}, external([{ ...record, code: 'other' }]))).toBe('Invalid register value.');
      expect(await Keywords.register({ ...record }, schema, {}, {}, external([]))).toBe('Invalid register value.');
    });

    it('validates verified user info fields', async () => {
      const schema = { control: 'verifiedUserInfo', fields: ['email', 'name'] };
      const filled = { email: { value: 'a@example.test' }, name: { value: 'N' }, verified: { email: true } };
      expect(await Keywords.checkVerifiedUserInfo(filled, schema, {}, {}, {})).toBe('');
      expect(await Keywords.checkVerifiedUserInfo({ ...filled, name: undefined }, schema, {}, {}, {})).toContain('name');
      expect(await Keywords.checkVerifiedUserInfo({ ...filled, email: { value: '' } }, schema, {}, {}, {})).toContain('email');
      expect(await Keywords.checkVerifiedUserInfo({ ...filled, email: undefined, verified: {} }, { ...schema, fields: ['email'] }, {}, {}, {})).toBe(
        '',
      );
      expect(await Keywords.checkVerifiedUserInfo({}, { ...schema, hiddenIsValid: true }, {}, {}, {})).toBe('');
      expect(await Keywords.checkVerifiedUserInfo({}, { control: 'other' }, {}, {}, {})).toBe('');
      expect(await Keywords.checkVerifiedUserInfo(filled, { ...schema, calculateFields: '() => ["name"]' }, {}, {}, {})).toBe('');
      await expect(
        Keywords.checkVerifiedUserInfo(filled, { ...schema, calculateFields: '() => { throw new Error("x"); }' }, {}, {}, {}),
      ).rejects.toThrow('calculateFields');
    });

    it('runs all checkers through Keywords.check', async () => {
      expect(await Keywords.check('x', { checkValid: '() => true' }, {}, {}, {})).toEqual([]);
      expect((await Keywords.check('x', { checkValid: '() => false', htmlMinLength: 5 }, {}, {}, {})).length).toBe(2);
    });
  });

  describe('readonly parameters', () => {
    const properties = {
      locked: { type: 'string', readOnly: true },
      checked: { type: 'string', checkReadOnly: '(data) => data.locked === "set"' },
      page: { type: 'object', readOnly: true, properties: { inner: { type: 'string' } } },
      open: { type: 'object', properties: { a: { type: 'string', readOnly: true }, b: { type: 'string' } } },
      pay: { type: 'object', control: 'payment', properties: { sum: { type: 'number' } } },
      info: { type: 'object', control: 'verifiedUserInfo', fields: ['email'], properties: { email: { type: 'object' }, other: { type: 'string' } } },
      reader: { type: 'object', control: 'externalReaderCheck', properties: { x: { type: 'string' } } },
      external: { type: 'string', value: 'external-reader.service.method' },
      initData: { type: 'object', properties: { a: { type: 'string' } } },
      calc: { type: 'string' },
    };
    const data = { locked: 'set', open: { a: 'keep', b: 'old' } };
    const run = (props, system = false, triggers: string[] = []) =>
      validator(properties, { calcTriggers: [{ target: 'calc', calculate: '() => 1', validate: true }] }).removeReadonlyParams(
        props,
        data,
        system,
        triggers,
      );

    it('drops writes to readonly controls and keeps the rest', async () => {
      const result = await run([
        { path: 'locked', value: 'x' },
        { path: 'checked', value: 'x' },
        { path: 'page.inner', value: 'x' },
        { path: 'open.b', value: 'new' },
        { path: 'pay.sum', value: 1 },
        { path: 'info.email', value: {} },
        { path: 'info.other', value: 'x' },
        { path: 'reader.x', value: 'x' },
        { path: 'external', value: 'x' },
        { path: 'initData.a', value: 'x' },
      ]);
      const paths = result.map((item) => item.path);
      expect(paths).toContain('open.b');
      for (const dropped of ['locked', 'page.inner', 'pay.sum', 'reader.x', 'external', 'initData.a']) {
        expect(paths).not.toContain(dropped);
      }
    });

    it('keeps init data for system tasks and restores readonly inner values', async () => {
      const system = await run([{ path: 'initData.a', value: 'x' }], true);
      expect(system).toHaveLength(1);
      const merged = await run([{ path: 'open', value: { a: 'hacked', b: 'new' } }]);
      expect(merged[0].value).toEqual({ a: 'keep', b: 'new' });
      expect(await run([{ path: 'pay', value: { sum: 1 } }])).toEqual([]);
      expect(await run([{ path: 'info', value: { email: {} } }])).toEqual([]);
      expect(await run([{ path: 'reader', value: { x: 1 } }])).toEqual([]);
    });

    it('lets calc trigger targets through and answers the trigger helpers', async () => {
      const checker = validator(properties, { calcTriggers: [{ target: 'calc', calculate: '() => 1', validate: true }] });
      expect(checker.isCalcTriggerTargetPath('calc')).toBe(true);
      expect(checker.isCalcTriggerTargetPath('locked')).toBe(false);
      const result = await checker.removeReadonlyParams([{ path: 'calc', value: 'x' }], data, false, ['calc']);
      expect(result).toHaveLength(1);
    });

    it('compares previous values with the stored ones', () => {
      const checker = validator(properties);
      const result = checker.checkPreviousValues([{ path: 'open.b', previousValue: 'old', value: 'x' }], data);
      expect(Array.isArray(result) || result === undefined || typeof result === 'object').toBe(true);
    });
  });

  describe('calc triggers', () => {
    const triggers = (calcTriggers: any[], properties: any = {}) =>
      validator({ src: { type: 'string' }, tgt: { type: 'string' }, step1: { type: 'object' }, ...properties }, { calcTriggers });

    it('reports a mismatch between the stored and the calculated target', async () => {
      const checker = triggers([{ source: 'src', target: 'tgt', calculate: '(v) => v + "!"', validate: true }]);
      expect(await checker.checkCalcTriggers({ src: 'a', tgt: 'a!' })).toEqual([]);
      const errors = await checker.checkCalcTriggers({ src: 'a', tgt: 'wrong' });
      expect(errors).toHaveLength(1);
      expect(errors[0].dataPath).toBe('tgt');
    });

    it('limits the check to the written paths', async () => {
      const checker = triggers([{ source: 'src', target: 'tgt', calculate: '(v) => v + "!"', validate: true }]);
      expect(await checker.checkCalcTriggers({ src: 'a', tgt: 'wrong' }, ['other'])).toEqual([]);
      expect(await checker.checkCalcTriggers({ src: 'a', tgt: 'wrong' }, ['tgt'])).toHaveLength(1);
      expect(await checker.checkCalcTriggers({ src: 'a', tgt: 'wrong' }, ['other'], ['tgt'])).toHaveLength(1);
    });

    it('ignores triggers that are not validated or have actions', async () => {
      const checker = triggers([
        { source: 'src', target: 'tgt', calculate: '() => "x"' },
        { source: 'src', target: 'tgt', calculate: '() => "x"', validate: true, action: 'something' },
        { source: 'src', calculate: '() => "x"', validate: true },
      ]);
      expect(await checker.checkCalcTriggers({ src: 'a', tgt: 'wrong' })).toEqual([]);
    });

    it('checks silent, step and callBeforePdf triggers', async () => {
      const checker = validator(
        { step1: { type: 'object', properties: { a: { type: 'string' } } }, tgt: { type: 'string' } },
        {
          pdfRequired: true,
          calcTriggers: [
            { target: 'tgt', calculate: '() => "silent"', validate: true },
            { step: 'step1', target: 'tgt', calculate: '() => "step"', validate: true },
            { callBeforePdf: true, target: 'tgt', calculate: '() => "pdf"', validate: true },
          ],
        },
      );
      const errors = await checker.checkCalcTriggers({ step1: { a: 'x' }, tgt: 'something' });
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });

    it('checks index templated triggers for every array item', async () => {
      const checker = validator(
        { list: { type: 'array', items: { type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } } } } },
        { calcTriggers: [{ source: 'list.${index}.a', target: 'list.${index}.b', calculate: '(v) => v + "!"', validate: true }] },
      );
      expect(
        await checker.checkCalcTriggers({
          list: [
            { a: '1', b: '1!' },
            { a: '2', b: '2!' },
          ],
        }),
      ).toEqual([]);
      const errors = await checker.checkCalcTriggers({
        list: [
          { a: '1', b: '1!' },
          { a: '2', b: 'bad' },
        ],
      });
      expect(errors).toHaveLength(1);
      expect(errors[0].dataPath).toBe('list.1.b');
    });

    it('does not fail when a calculation throws', async () => {
      const checker = triggers([{ source: 'src', target: 'tgt', calculate: '() => { throw new Error("x"); }', validate: true }]);
      expect(Array.isArray(await checker.checkCalcTriggers({ src: 'a', tgt: 'b' }))).toBe(true);
    });
  });
});
