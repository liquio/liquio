import { describe, expect, it } from 'vitest';
import { calcTriggers } from './separatedRegister';
import { calcTriggersMulti } from './separatedRegisterMulti';

describe('Address calcTriggers (separatedRegister)', () => {
  it('clears both indexes when isPrivateHouse changes, in a step', () => {
    expect(calcTriggers({ stepName: 's.addr' })[0]).toEqual({
      source: 's.addr.isPrivateHouse',
      target: ['s.addr.apt.index', 's.addr.building.index'],
      calculate: '() => undefined'
    });
  });

  it('returns the step trigger set with ATU, region, district and city clears', () => {
    expect(calcTriggers({ stepName: 's' }).map(({ source, target }) => [source, target])).toEqual([
      ['s.isPrivateHouse', ['s.apt.index', 's.building.index']],
      ['s.ATU', 's.street'],
      ['s.region', 's.district'],
      ['s.region', 's.city'],
      ['s.region', 's.street'],
      ['s.district', 's.city'],
      ['s.district', 's.street'],
      ['s.city', 's.street']
    ]);
  });

  it('returns the array/popup trigger set without the ATU clear', () => {
    expect(calcTriggers({ stepName: 's', isArray: true }).map(({ source, target }) => [source, target])).toEqual([
      ['s.isPrivateHouse', ['s.apt.index', 's.building.index']],
      ['s.region', 's.district'],
      ['s.region', 's.city'],
      ['s.region', 's.street'],
      ['s.district', 's.city'],
      ['s.district', 's.street'],
      ['s.city', 's.street']
    ]);
  });

  it('returns the same set for a popup as for an array', () => {
    expect(calcTriggers({ stepName: 's', isPopup: true })).toEqual(calcTriggers({ stepName: 's', isArray: true }));
  });
});

describe('Address calcTriggersMulti (separatedRegisterMulti)', () => {
  it('returns the step trigger set with district and city clears and no index copy triggers', () => {
    expect(
      calcTriggersMulti({ stepName: 's', addressName: 'home' }).map(({ source, target, calculate }) => [
        source,
        target,
        calculate
      ])
    ).toEqual([
      ['s.homeATU', 's.homeStreet', '() => undefined'],
      ['s.homeRegion', 's.homeDistrict', '() => undefined'],
      ['s.homeRegion', 's.homeCity', '() => undefined'],
      ['s.homeRegion', 's.homeStreet', '() => undefined'],
      ['s.homeDistrict', 's.homeCity', '() => undefined'],
      ['s.homeDistrict', 's.homeStreet', '() => undefined'],
      ['s.homeCity', 's.homeStreet', '() => undefined']
    ]);
  });

  it('keeps the index copy triggers in the array/popup set', () => {
    expect(
      calcTriggersMulti({ stepName: 's', addressName: 'home', isArray: true }).map(({ source, target, calculate }) => [
        source,
        target,
        calculate
      ])
    ).toEqual([
      ['s.homeBuilding.index', 's.homeApt.index', '(val) => val'],
      ['s.homeApt.index', 's.homeBuilding.index', '(val) => val'],
      ['s.homeRegion', 's.homeDistrict', '() => undefined'],
      ['s.homeRegion', 's.homeCity', '() => undefined'],
      ['s.homeRegion', 's.homeStreet', '() => undefined'],
      ['s.homeDistrict', 's.homeCity', '() => undefined'],
      ['s.homeDistrict', 's.homeStreet', '() => undefined'],
      ['s.homeCity', 's.homeStreet', '() => undefined']
    ]);
  });
});
