import { describe, expect, it } from 'vitest';
import rootReducer from './index';

describe('reducers/index', () => {
  it('combines the auth and eds slices only', () => {
    expect(rootReducer(undefined, { type: '@@INIT' })).toEqual({
      auth: { DBError: false, ERROR_503: false },
      eds: { kmTypes: [], inited: false },
    });
  });

  it('routes an action to the slice that handles it', () => {
    const state = rootReducer(undefined, { type: 'DB_ERROR' });
    expect(state.auth.DBError).toBe(true);
    expect(state.eds.inited).toBe(false);
  });
});
