import { getIdApiClient } from '@liquio/back-core';

import { UnitBusiness } from './unit';
import { Exceptions } from '../exceptions';
import { UnitEntity } from '../entities/unit';
import { UNIT_ADMIN_UNIT, SECURITY_ADMIN_UNIT } from '../constants/unit';

jest.mock('@liquio/back-core', () => ({ ...jest.requireActual('@liquio/back-core'), getIdApiClient: jest.fn() }));

describe('UnitBusiness.update basedOn access', () => {
  const OWNED = 5;
  const OTHER = 6;
  const USER = 'new-user';

  const unitAdmin = { all: [UNIT_ADMIN_UNIT, OWNED], head: [OWNED] };
  const securityAdmin = { all: [UNIT_ADMIN_UNIT, SECURITY_ADMIN_UNIT], head: [SECURITY_ADMIN_UNIT] };

  let business: UnitBusiness;
  let units: Record<number, any>;
  let models: any;

  const entity = (basedOn: number[], members: string[] = []) =>
    new UnitEntity({ id: OWNED, name: 'owned', basedOn, members, heads: [], data: {} } as any);

  const mk = (id: number, extra: any = {}) => ({ id, basedOn: [], members: [], heads: [], membersIpn: [], headsIpn: [], ...extra });

  beforeEach(() => {
    (UnitBusiness as any).singleton = undefined;
    (getIdApiClient as jest.Mock).mockReturnValue({
      getUsersByIdsWithCache: jest.fn().mockResolvedValue([{ userId: USER }]),
    });
    units = { [OWNED]: mk(OWNED), [OTHER]: mk(OTHER), [SECURITY_ADMIN_UNIT]: mk(SECURITY_ADMIN_UNIT) };
    models = {
      unit: {
        findById: jest.fn(async (id) => units[id]),
        updateMembers: jest.fn(),
        updateHeads: jest.fn(),
        create: jest.fn(async (e) => e),
      },
      accessHistory: { save: jest.fn() },
      task: { removePerformerUserFromTasks: jest.fn() },
    };
    (global as any).models = models;
    business = new UnitBusiness({});
  });

  afterEach(() => {
    delete (global as any).models;
  });

  const expectNoWrites = () => {
    expect(models.unit.updateMembers).not.toHaveBeenCalled();
    expect(models.unit.updateHeads).not.toHaveBeenCalled();
    expect(models.unit.create).not.toHaveBeenCalled();
  };

  it('rejects unit admin adding a security admin unit to basedOn', async () => {
    await expect(business.update(unitAdmin, entity([SECURITY_ADMIN_UNIT], [USER]), {})).rejects.toBeInstanceOf(Exceptions.ACCESS);
    expectNoWrites();
  });

  it('rejects unit admin adding an unheaded unit to basedOn even without new members', async () => {
    await expect(business.update(unitAdmin, entity([OTHER]), {})).rejects.toBeInstanceOf(Exceptions.ACCESS);
    expectNoWrites();
  });

  it('allows unit admin to add a unit they head to basedOn', async () => {
    const ids = { all: [UNIT_ADMIN_UNIT, OWNED, OTHER], head: [OWNED, OTHER] };
    await business.update(ids, entity([OTHER], [USER]), {});
    expect(models.unit.updateMembers).toHaveBeenCalledWith(OTHER, [USER]);
  });

  it('allows security admin to add any unit to basedOn', async () => {
    await business.update(securityAdmin, entity([SECURITY_ADMIN_UNIT], [USER]), {});
    expect(models.unit.updateMembers).toHaveBeenCalledWith(SECURITY_ADMIN_UNIT, [USER]);
  });

  it('rejects new members propagated into an already existing unheaded basedOn unit', async () => {
    units[OWNED].basedOn = [SECURITY_ADMIN_UNIT];
    await expect(business.update(unitAdmin, entity([SECURITY_ADMIN_UNIT], [USER]), {})).rejects.toBeInstanceOf(Exceptions.ACCESS);
    expectNoWrites();
  });

  it('allows unchanged existing unheaded basedOn when nothing is propagated', async () => {
    units[OWNED].basedOn = [SECURITY_ADMIN_UNIT];
    await business.update(unitAdmin, entity([SECURITY_ADMIN_UNIT]), {});
    expect(models.unit.updateMembers).toHaveBeenCalledWith(SECURITY_ADMIN_UNIT, []);
    expect(models.unit.create).toHaveBeenCalled();
  });
});
