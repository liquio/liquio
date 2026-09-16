import { expectTypeOf, it } from 'vitest';
import type { RootState, AppDispatch } from './types';

function selectToken(dispatch: AppDispatch) {
  return dispatch((_send, getState) => getState().auth.token);
}

it('derives named app slices and thunk return types', () => {
  expectTypeOf<RootState>().toHaveProperty('task');
  expectTypeOf<RootState>().not.toHaveProperty('tasks');
  expectTypeOf(selectToken).returns.toEqualTypeOf<string | null>();
});
