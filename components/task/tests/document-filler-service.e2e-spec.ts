import { TestApp } from './test-app';
import { seedScenario, addUnit, SCENARIO } from './helpers/scenario';
import { RegistersFiller } from '../src/services/document_filler/fillers/registers';
import { RegistersDefaultValueFiller } from '../src/services/document_filler/fillers/registers_default_value';
import { VerifiedUserInfoFiller } from '../src/services/document_filler/fillers/verified_user_info';
import { CopyWorkflowDocumentFiller } from '../src/services/document_filler/fillers/copy_workflow_document';

const USER = SCENARIO.userId;

// Document fillers that read other services: registers, register default values, verified user info
// and the copy of a workflow document; reading services are replaced by spies, the database is real.
describe('Document filler service', () => {
  let app: TestApp;
  const schema = (properties: any) => ({ properties });

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await seedScenario(app);
    await addUnit(app, { id: 990081, name: 'Filler unit', heads: [USER], members: [USER], heads_ipn: [], members_ipn: [] });
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

  describe('registers', () => {
    it('fills a field with records found by filters and search functions', async () => {
      const filler = new RegistersFiller();
      const spy = jest
        .spyOn(filler.registerService, 'getFilteredRecords')
        .mockResolvedValue({ data: [{ id: 'r1', registerId: 1, keyId: 5, data: { code: 'A' } }] } as any);
      const objectToFill: any = { name: 'x' };
      const jsonSchema = schema({
        list: {
          value: 'registers.keys.5',
          limit: 3,
          filters: [
            { name: 'owner', value: 'user.userId' },
            { name: 'unit', value: '({ user, units, documentData }) => documentData.name' },
            { name: 'plain', value: 'fixed' },
            { name: 'skipped', value: '() => undefined' },
          ],
          ignoreEmptyFilters: true,
          searchEqual: '(data) => data.name',
          searchEqual2: '() => "e2"',
          searchEqual3: '() => "e3"',
          searchLike: '() => "l1"',
          searchLike2: '() => "l2"',
          searchLike3: '() => "l3"',
          sortBy: { code: 'asc' },
        },
      });
      await filler.fill(jsonSchema, objectToFill, { userInfo: { userId: 'u1' }, userUnitsEntities: { all: [] } });
      expect(objectToFill.list).toEqual([{ code: 'A', registerId: 1, keyId: 5, recordId: 'r1' }]);
      const params = spy.mock.calls[0][0] as any;
      expect(params).toMatchObject({
        key_id: 5,
        limit: 3,
        data: { owner: 'u1', unit: 'x', plain: 'fixed' },
        search_equal: 'x',
        search_3: 'l3',
        sort: { code: 'asc' },
      });
    });

    it('ignores broken functions, missing user info and register errors', async () => {
      const filler = new RegistersFiller();
      const spy = jest.spyOn(filler.registerService, 'getFilteredRecords').mockResolvedValue({ data: [] } as any);
      const broken = '() => { throw new Error("x"); }';
      const objectToFill: any = {};
      await filler.fill(
        schema({
          list: {
            value: 'registers.keys.5',
            searchEqual: broken,
            searchEqual2: broken,
            searchEqual3: broken,
            searchLike: broken,
            searchLike2: broken,
            searchLike3: broken,
          },
        }),
        objectToFill,
        {},
      );
      expect(objectToFill.list).toEqual([]);
      const withoutUser: any = {};
      await filler.fill(
        schema({
          a: { value: 'registers.keys.5', filters: [{ name: 'f', value: 'user.userId' }] },
          b: { value: 'registers.keys.5', filters: [{ name: 'f', value: '({ user }) => 1' }] },
          c: { value: 'other' },
        }),
        withoutUser,
        {},
      );
      expect(withoutUser).toEqual({});
      spy.mockRejectedValueOnce(new Error('register down'));
      const failed: any = {};
      await filler.fill(schema({ list: { value: 'registers.keys.5' } }), failed, {});
      expect(failed.list).toBeUndefined();
    });
  });

  describe('registers default value', () => {
    const control = (extra: any = {}) => ({ control: 'register', keyId: 7, defaultValue: 'code=A', ...extra });

    it('fills one or many normalized records', async () => {
      const filler = new RegistersDefaultValueFiller();
      const records = {
        data: [
          { id: 'r1', registerId: 1, keyId: 7, data: { code: 'A', secret: 's' } },
          { id: 'r2', registerId: 1, keyId: 7, data: { code: 'A' } },
        ],
      };
      const spy = jest.spyOn(filler.registerService, 'getFilteredRecords').mockResolvedValue(records as any);
      jest
        .spyOn(filler.registerService, 'findKeyById')
        .mockResolvedValue({ schema: { properties: { code: { public: true } } }, toString: '(record) => record.data.code' } as any);
      const one: any = {};
      await filler.fill(
        schema({
          item: control({
            filters: [
              { name: 'owner', value: 'user.userId' },
              { name: 'fixed', value: 5 },
            ],
          }),
        }),
        one,
        { userInfo: { userId: 'u1' } },
      );
      expect(one.item).toMatchObject({ id: 'r1', value: 'r1', code: 'A', stringified: 'A', label: 'A' });
      expect(one.item.secret).toBeUndefined();
      expect((spy.mock.calls[0][0] as any).data).toEqual({ code: 'A', owner: 'u1', fixed: 5 });
      const many: any = {};
      await filler.fill(schema({ item: control({ multiple: true }) }), many, {});
      expect(many.item).toHaveLength(2);
    });

    it('skips unsuitable controls and handles a failing key', async () => {
      const filler = new RegistersDefaultValueFiller();
      jest.spyOn(filler.registerService, 'getFilteredRecords').mockResolvedValue({ data: [{ id: 'r1', registerId: 1, keyId: 7, data: {} }] } as any);
      jest.spyOn(filler.registerService, 'findKeyById').mockResolvedValue({ schema: {}, toString: '() => { throw new Error("x"); }' } as any);
      const objectToFill: any = {};
      await filler.fill(
        schema({
          a: { control: 'other' },
          b: control({ keyId: '7' }),
          c: control({ defaultValue: 'no-equal' }),
          d: control({ filters: [{ name: 'f', value: 1 }] }),
          e: control(),
        }),
        objectToFill,
        {},
      );
      expect(Object.keys(objectToFill)).toEqual(['e']);
      expect(objectToFill.e.stringified).toBeUndefined();
    });
  });

  describe('verified user info', () => {
    const fields = ['email', 'phone', 'birthday', 'gender', 'unzr', 'passport', 'index'];
    const passport = {
      data: {
        eddr_info: 'true',
        unzr: 'U1',
        date_birth: '2000-01-01',
        birth_place: 'City',
        birth_country: 'UA',
        birth_country_id: 1,
        gender: 'M',
        documents: { documents: 'true', type: 'pass', documentSerial: 'AA', number: '123', dep_issue: 'Dep', date_issue: 'i', date_expiry: 'e' },
      },
    };

    it('fills verified fields from the user and the passport data', async () => {
      const filler = new VerifiedUserInfoFiller();
      const reader = jest.spyOn(filler.externalReader, 'getDataByUser').mockResolvedValue(passport as any);
      const objectToFill: any = {};
      await filler.fill(schema({ info: { control: 'verifiedUserInfo', fields } }), objectToFill, {
        userInfo: { email: 'a@example.test', phone: '+380501234567', ipn: '1234567890' },
        oauthToken: 'fake-token',
      });
      expect(reader).toHaveBeenCalled();
      expect(objectToFill.info.verified).toMatchObject({
        email: true,
        phone: true,
        birthday: true,
        gender: true,
        unzr: true,
        passport: true,
        index: false,
      });
      expect(objectToFill.info.passport).toMatchObject({ type: 'passport', series: 'AA' });
      expect(objectToFill.info.gender.value).toBe('male');
    });

    it('marks unverified fields and survives reader errors', async () => {
      const filler = new VerifiedUserInfoFiller();
      const reader = jest
        .spyOn(filler.externalReader, 'getDataByUser')
        .mockResolvedValue({ data: { eddr_info: 'false', unzr: '', gender: '' } } as any);
      const objectToFill: any = {};
      const options = { userInfo: { email: '', phone: '' }, oauthToken: 'fake-token' };
      await filler.fill(schema({ info: { control: 'verifiedUserInfo', fields } }), objectToFill, options);
      expect(objectToFill.info.verified).toMatchObject({ email: false, phone: false, birthday: false, gender: false, unzr: false, passport: false });
      const noData: any = {};
      reader.mockResolvedValueOnce(undefined as any);
      await filler.fill(schema({ info: { control: 'verifiedUserInfo', fields: ['unzr', 'gender'] } }), noData, options);
      expect(noData.info.verified.unzr).toBe(false);
      reader.mockRejectedValueOnce(new Error('reader down'));
      await filler.fill(schema({ info: { control: 'verifiedUserInfo', fields: ['unzr'] } }), {}, options);
      const skipped: any = {};
      await filler.fill(schema({ a: { control: 'other' }, b: { control: 'verifiedUserInfo', fields } }), skipped, {});
      expect(skipped).toEqual({});
    });

    it('derives gender and birthday from the tax number', () => {
      const filler = new VerifiedUserInfoFiller();
      expect(filler.getGenderByRnokpp('1234567810')).toBe('male');
      expect(filler.getGenderByRnokpp('1234567800')).toBe('female');
      expect(filler.getGenderByRnokpp('short')).toBeUndefined();
      expect(filler.getGenderByRnokpp('12345678x0')).toBeUndefined();
      expect(typeof filler.getBirthdayByRnokpp('3000000000')).toBe('string');
      expect(filler.getBirthdayByRnokpp(undefined)).toBeUndefined();
    });
  });

  describe('copy workflow document', () => {
    const control = (extra: any = {}) => ({ control: 'copyWorkflowDocument', path: 'source', steps: ['copied'], ...extra });
    const options = (extra: any = {}) => ({
      documentId: 'target-doc',
      userInfo: { userId: USER },
      userUnitsEntities: { all: [{ id: 990081 }] },
      oauthToken: 'fake-token',
      ...extra,
    });

    it('skips when the source is not defined or not allowed', async () => {
      const filler = new CopyWorkflowDocumentFiller();
      const find = jest.spyOn((global as any).models.task, 'findDocumentByWorkflowIdAndTaskTemplateId');
      const base = { source: { workflowId: 'w', taskTemplateId: 1 } };
      const run = async (itemControl: any, objectToFill: any, extra: any = {}) =>
        filler.fill(schema({ item: itemControl }), objectToFill, options(extra));
      await run(control(), { source: {} });
      await run(control(), { ...base }, { oauthToken: undefined });
      find.mockResolvedValueOnce({} as any);
      await run(control(), { ...base });
      find.mockResolvedValue({ document: { id: 'src', createdBy: 'someone-else', data: { copied: 'yes' } } } as any);
      const foreign: any = { ...base };
      await run(control(), foreign);
      expect(foreign.copied).toBeUndefined();
      await run(control({ unitId: '() => null' }), { ...base });
      await run(control({ unitId: '() => { throw new Error("x"); }' }), { ...base });
      await run(control({ unitId: 5 }), { ...base });
      find.mockRejectedValueOnce(new Error('db down'));
      await run(control(), { ...base });
    });

    it('copies steps and attachments of an allowed document', async () => {
      const filler = new CopyWorkflowDocumentFiller();
      jest.spyOn((global as any).models.task, 'findDocumentByWorkflowIdAndTaskTemplateId').mockResolvedValue({
        document: { id: 'src', createdBy: USER, data: { copied: { file: 'link-1', empty: null } } },
      } as any);
      jest.spyOn((global as any).models.documentAttachment, 'getByDocumentId').mockResolvedValue([
        { id: 'a1', link: 'link-1', documentId: 'src', name: 'f.txt', type: 'text/plain' },
        { id: 'a2', link: 'link-2', documentId: 'src', name: 'g.txt', type: 'text/plain' },
      ] as any);
      jest.spyOn(filler.storageService.provider, 'copyFile').mockResolvedValue({ id: 'copy-1' });
      const create = jest
        .spyOn((global as any).models.documentAttachment, 'create')
        .mockResolvedValue({ id: 'c1', link: 'copy-1', documentId: 'target-doc' } as any);
      const objectToFill: any = { source: { workflowId: 'w', taskTemplateId: 1 } };
      await filler.fill(schema({ item: control({ unitId: '(data) => 990081', steps: ['copied', 'missing'] }) }), objectToFill, options());
      expect(create).toHaveBeenCalledTimes(2);
      expect(objectToFill.copied.file).toBe('copy-1');
      const outside: any = { source: { workflowId: 'w', taskTemplateId: 1 } };
      await filler.fill(schema({ item: control({ unitId: 1 }) }), outside, options());
      expect(outside.copied).toBeUndefined();
    });
  });
});
