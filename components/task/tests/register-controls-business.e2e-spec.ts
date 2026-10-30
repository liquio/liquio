import { TestApp } from './test-app';
import { getBusinesses } from '../src/lib/context';

const OWNER_KEY = 21;
const LINKED_KEY = 22;
const UNIT_USER = { all: [990071], head: [], member: [990071] };

// RegisterBusiness control handling (registerLink), strict records and record access, with a fake register service.
describe('Register controls business', () => {
  let app: TestApp;
  const register = () => getBusinesses().register;

  const ownerSchema = {
    type: 'object',
    properties: {
      code: { type: 'string', public: true, readOnly: true },
      link: { type: 'string', control: 'registerLink', linkTo: 'number', linkKeyId: LINKED_KEY, public: true },
      relationId: { type: 'string', isRelationId: true },
      relationLink: { type: 'string', isRelationLink: true },
      id: { type: 'string', public: true },
    },
  };
  const keys = (toSearchString: string) => [
    { id: OWNER_KEY, registerId: 1, name: 'Owner', schema: ownerSchema, toString: '(record) => record.data.code', toSearchString: '', meta: {} },
    {
      id: LINKED_KEY,
      registerId: 2,
      name: 'Linked',
      schema: { type: 'object', properties: {} },
      toString: '(record) => "label-" + record.data.number',
      toSearchString,
      meta: {},
    },
  ];

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  const prepare = (toSearchString = 'data.number') => {
    jest.spyOn(register(), 'prepareData').mockResolvedValue(undefined);
    register().keys = keys(toSearchString);
    return jest.spyOn(register().registerService, 'getRecords');
  };

  describe('handleControlsGet', () => {
    it('returns the list as is when it is empty', async () => {
      expect(await register().handleControlsGet({ data: [] }, ownerSchema)).toEqual([]);
    });

    it('queries the linked records by the search column of the label', async () => {
      const getRecords = prepare('[data.name, data.number]');
      getRecords.mockResolvedValue({ data: [{ id: 'l1', data: { number: 1 } }] } as any);
      const schema = JSON.parse(JSON.stringify(ownerSchema));
      // A string label is built inside a plain function that has no `this` (see BUGS.md), so the call rejects.
      await expect(register().handleControlsGet({ data: [{ data: { link: 1 } }, { data: { link: 9 } }] }, schema)).rejects.toThrow();
      expect(getRecords.mock.calls[0][0]).toMatchObject({ key_id: LINKED_KEY, search_2: [1, 9], is_search_string_array: true });
    });

    it('links whole records and handles duplicates of the same link', async () => {
      const getRecords = prepare('data.number');
      getRecords.mockResolvedValue({ data: [{ id: 'l1', data: { number: 1, extra: 'x' } }] } as any);
      const schema = JSON.parse(JSON.stringify(ownerSchema));
      schema.properties.link.isFull = true;
      const records = { data: [{ data: { link: 1 } }, { data: { link: 1 } }] };
      const result = await register().handleControlsGet(records, schema);
      expect(result.every((v) => v.data.linkLinked?.extra === 'x')).toBe(true);
      expect(getRecords.mock.calls[0][0]).toMatchObject({ search: [1, 1] });
    });
  });

  describe('handleControlsUpdate and handleControlsCreate', () => {
    it('keeps read only fields and accepts an existing linked record', async () => {
      const getRecords = prepare('[a, data.number]');
      getRecords.mockResolvedValue({ data: [{ id: 'l1' }] } as any);
      jest.spyOn(register().registerService, 'findRecordById').mockResolvedValue({ data: { code: 'OLD' } } as any);
      const record = { keyId: OWNER_KEY, data: { code: 'NEW', link: 5 } };
      const updated = await register().handleControlsUpdate('r1', record);
      expect(updated.data.code).toBe('OLD');
      expect(getRecords.mock.calls[0][0]).toMatchObject({ search_2: 5 });
      await register().handleControlsUpdate('r1', { keyId: OWNER_KEY, data: { code: 'NEW' } });
      expect(await register().handleControlsCreate({ keyId: OWNER_KEY, data: { link: 5 } })).toMatchObject({ keyId: OWNER_KEY });
      await register().handleControlsCreate({ keyId: OWNER_KEY, data: {} });
    });

    it('rejects a link to a record that does not exist', async () => {
      const getRecords = prepare('[a, b, data.number]');
      getRecords.mockResolvedValue({ data: [] } as any);
      jest.spyOn(register().registerService, 'findRecordById').mockResolvedValue({ data: { code: 'OLD' } } as any);
      await expect(register().handleControlsUpdate('r1', { keyId: OWNER_KEY, data: { link: 5 } })).rejects.toThrow('record to link not found');
      await expect(register().handleControlsCreate({ keyId: OWNER_KEY, data: { link: 5 } })).rejects.toThrow('record to link not found');
      expect(getRecords.mock.calls[0][0]).toMatchObject({ search_3: 5 });
    });
  });

  describe('records and keys', () => {
    it('converts a record to the strict form with public fields and relations', () => {
      const record = {
        id: 'r1',
        registerId: 1,
        keyId: OWNER_KEY,
        createdAt: 'c',
        updatedAt: 'u',
        data: { code: 'A', link: 1, relationId: 'rid', relationLink: 'rl', id: 'inner' },
      };
      const strict = register().convertToStrictRecord(record, '(record) => record.data.code', ownerSchema, 7);
      expect(strict).toMatchObject({
        id: 'r1',
        stringified: 'A',
        code: 'A',
        link: 1,
        isRelationId: 'rid',
        isRelationLink: 'rl',
        _id: 'inner',
        parentKeyId: 7,
        recordCreatedAt: 'c',
      });
      expect(register().convertToStrictRecord(record, '() => { throw new Error("x"); }').stringified).toBeUndefined();
      expect(register().convertToStrictRecord(record).stringified).toBeUndefined();
    });

    it('detects allow token fields in a key schema', () => {
      jest.spyOn(register(), 'prepareData').mockResolvedValue(undefined);
      register().keys = [
        { id: 1, schema: { properties: { a: { allowTokens: ['t'] } } } },
        { id: 2, schema: { properties: { a: { allowTokens: [] } } } },
      ];
      expect(register().checkKeyContainsAllowTokensOptionFields(1)).toBe(true);
      expect(register().checkKeyContainsAllowTokensOptionFields(2)).toBe(false);
    });

    it('finds a record with an access check', async () => {
      jest.spyOn(register(), 'getAccessConfig').mockResolvedValue({ userUnitsAccess: [], accessConfigMethod: 'allowRead' } as any);
      const access = jest.spyOn(register(), 'hasAccess').mockReturnValue(true);
      const getRecords = jest.spyOn(register().registerService, 'getRecords').mockResolvedValue({ data: [{ id: 'r1' }] } as any);
      await expect(register().findRecordAndCheckAccess('r1', 1, undefined, UNIT_USER)).rejects.toThrow('allowTokens');
      expect(await register().findRecordAndCheckAccess('r1', 1, ['t'], UNIT_USER)).toEqual({ id: 'r1' });
      getRecords.mockResolvedValueOnce({ data: [] } as any);
      await expect(register().findRecordAndCheckAccess('r1', 1, ['t'], UNIT_USER)).rejects.toThrow();
      access.mockReturnValue(false);
      await expect(register().findRecordAndCheckAccess('r1', 1, ['t'], UNIT_USER)).rejects.toThrow();
    });

    it('finds a record by id for users with access only', async () => {
      jest.spyOn(register(), 'getAccessConfig').mockResolvedValue({ userUnitsAccess: [], accessConfigMethod: 'allowRead' } as any);
      const access = jest.spyOn(register(), 'hasAccess').mockReturnValue(true);
      const find = jest.spyOn(register().registerService, 'findRecordById').mockResolvedValue({ id: 'r1', keyId: 1 } as any);
      expect(await register().findRecordById('r1', UNIT_USER, {})).toEqual({ id: 'r1', keyId: 1 });
      access.mockReturnValue(false);
      await expect(register().findRecordById('r1', UNIT_USER, {})).rejects.toThrow();
      find.mockResolvedValueOnce(undefined as any);
      await expect(register().findRecordById('r1', UNIT_USER, {})).rejects.toThrow();
    });
  });
});
