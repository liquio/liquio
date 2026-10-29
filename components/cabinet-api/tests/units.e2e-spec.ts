import UnitModel from '../src/models/unit';
import Model from '../src/models/model';
import RedisClient from '../src/lib/redis_client';
import UnitEntity from '../src/entities/unit';
import Entity from '../src/entities/entity';
import { TestApp } from './test-app';

describe('Units (Postgres and Redis)', () => {
  let app: TestApp;
  let units: UnitModel;

  beforeAll(async () => {
    await TestApp.beforeAll({ redis: true });
    app = await TestApp.setup();
    units = new UnitModel();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
    await app.sql('TRUNCATE units RESTART IDENTITY');
    await app.sql(
      `INSERT INTO units (name, members, heads, allow_tokens, heads_ipn, members_ipn, requested_members) VALUES
        ('first', ARRAY['u1'], ARRAY['h1'], ARRAY['t1'], ARRAY['1111111111'], ARRAY['2222222222'], ARRAY[]::json[]),
        ('second', ARRAY['u2', 'u3'], ARRAY[]::varchar[], ARRAY[]::varchar[], ARRAY[]::varchar[], ARRAY[]::varchar[], ARRAY[]::json[])`,
    );
    await (new RedisClient({} as any) as any).client.flushAll();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  it('getAll returns unit entities and caches them in Redis keyed by the last update', async () => {
    const first = await units.getAll();
    expect(first.map((u) => u.name)).toEqual(['first', 'second']);
    expect(first[0]).toBeInstanceOf(UnitEntity);

    // Same `updated_at`: the cached list is returned even though the table changed behind the cache.
    await app.sql(`UPDATE units SET name = 'renamed' WHERE id = 1`);
    const cached = await units.getAll();
    expect(cached.map((u) => u.name)).toEqual(['first', 'second']);
  });

  it('getByIds and findById read straight from the database', async () => {
    expect((await units.getByIds([2])).map((u) => u.name)).toEqual(['second']);
    expect((await units.findById(1))?.name).toBe('first');
    expect(await units.findById(999)).toBeUndefined();
  });

  it('adds and removes members and heads', async () => {
    expect((await units.addMember(1, 'u9'))?.members).toEqual(['u1', 'u9']);
    expect((await units.removeMember(1, 'u9'))?.members).toEqual(['u1']);
    expect((await units.addHead(1, 'h9'))?.heads).toEqual(['h1', 'h9']);
  });

  it('removes head and member IPNs', async () => {
    expect((await units.removeHeadIpn(1, '1111111111'))?.headsIpn).toEqual([]);
    expect((await units.removeMemberIpn(1, '2222222222'))?.membersIpn).toEqual([]);
  });

  it('adds and removes a requested member', async () => {
    const requestedMember = { ipn: '3333333333', firstName: 'Test', middleName: 'Test', lastName: 'Test', wrongUserInfo: false };
    const added = await units.addRequestedMember(1, requestedMember);
    expect(added?.requestedMembers).toHaveLength(1);

    const removed = await units.removeRequestedMember(1, '3333333333');
    expect(removed.requestedMembers).toEqual([]);
  });

  it('returns null from the update helpers for an unknown unit', async () => {
    expect(await units.addMember(999, 'u1')).toBeNull();
    expect(await units.addHead(999, 'u1')).toBeNull();
    expect(await units.addRequestedMember(999, { ipn: '1', firstName: '', middleName: '', lastName: '', wrongUserInfo: false })).toBeNull();
    expect(await units.removeHeadIpn(999, '1')).toBeNull();
    expect(await units.removeMember(999, 'u1')).toBeNull();
    expect(await units.removeMemberIpn(999, '1')).toBeNull();
  });

  describe('base model helpers', () => {
    const paginate = (params: Record<string, unknown>) => {
      const sequelizeModel = (units as any).model;
      const context = { findAndCountAll: sequelizeModel.findAndCountAll.bind(sequelizeModel) };
      return Model.prototype.paginate.call(context, params as any);
    };

    beforeEach(() => {
      (global.config as any).model = { pagination: { limitPerPage: 1 } };
    });

    it('paginates with the per-page limit, sort and filters', async () => {
      const page = await paginate({ currentPage: 2, perPage: 50, sort: [['id', 'asc'], ['name'], 'bad' as any] });
      expect(page.pagination).toEqual({ total: 2, perPage: 1, currentPage: 2, lastPage: 2 });
      expect((page.data as any[]).map((u) => u.name)).toEqual(['second']);

      const filtered = await paginate({ currentPage: 0, filters: { name: 'first' }, where: { id: 1 }, subQuery: false });
      expect(filtered.pagination.currentPage).toBe(1);
      expect(filtered.data).toHaveLength(1);
    });

    it('prepareSort flattens sort options', () => {
      expect(units.prepareSort({ created_at: 'desc', name: { first: 'asc' } })).toEqual([
        ['created_at', 'desc'],
        ['name', 'first', 'asc'],
      ]);
    });

    it('getEntitiesByRelations fills the relations and logs failures', async () => {
      const entity: Record<string, unknown> = {};
      const sequelizeModel: any = { getItems: async () => [{ prepareEntity: () => 'prepared' }], getNothing: async () => null };
      await units.getEntitiesByRelations({ relations: ['items', 'nothing'], sequelizeModel, entity });
      expect(entity).toEqual({ items: ['prepared'] });

      await expect(units.getEntitiesByRelations({ relations: ['missing'], sequelizeModel, entity })).rejects.toThrow();
    });
  });

  describe('entities', () => {
    it('filterResponse keeps only the entity properties and rejects non-entities', () => {
      const entity = new UnitEntity({ id: 1, name: 'x' });
      expect(Entity.filterResponse(entity)).toBeDefined();
      expect(Entity.filterResponse([entity], true)).toHaveLength(1);
      expect(() => Entity.filterResponse({} as any)).toThrow('Item must be Entity.');
      expect(() => Entity.filterResponse([{}] as any)).toThrow('Item must be Entity.');
    });
  });
});
