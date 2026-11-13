import { describe, expect, it } from 'vitest';
import reducer, { newUnitConfig } from 'application/reducers/units';

describe('units reducer', () => {
  it('exposes a shared newUnitConfig default for a fresh unit', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.actual.new).toBe(newUnitConfig);
  });

  it('mirrors the CreateTaskButton nav flag onto the unit-level menuConfig on save', () => {
    const payload = {
      id: 1,
      menuConfig: { navigation: { tasks: { CreateTaskButton: true } } }
    };
    const result = reducer(undefined, { type: 'UNITS/REQUEST_UNIT_SUCCESS', payload });
    const stored = result.actual[1] as { menuConfig: { navigation: { CreateTaskButton?: boolean } } };
    expect(stored.menuConfig.navigation.CreateTaskButton).toBe(true);
  });

  it('removes a unit from the list on DATA_TABLE delete-success', () => {
    const initial = reducer(undefined, { type: 'UNITS/REQUEST_ALL_UNITS_SUCCESS', payload: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] });
    const result = reducer(initial, { type: 'DATA_TABLE/UNITLIST/ON_ROWS_DELETE_SUCCESS', url: '/units/1' });
    expect(result.list).toEqual([{ id: 2, name: 'b' }]);
  });
});
