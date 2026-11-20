import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import authReducer from 'core/reducers/auth';
import { useAppDispatch, useAppSelector } from 'core/store/hooks';
import type { RootState, AppDispatch } from 'store/types';
import type { AuthState, AuthAction } from 'core/types/authState';
import UnitNamesLabels from './UnitNamesLabels';

vi.mock('actions/auth', () => ({ AUTH_SET_TOKEN: 'AUTH_SET_TOKEN', TOKEN_ERROR: 'TOKEN_ERROR' }));
vi.mock('helpers/checkAuthPhoneValidation', () => ({ default: vi.fn() }));
vi.mock('helpers/configLoader', () => ({ getConfig: () => ({}) }));

function LoadUnits() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  return (
    <button
      onClick={() =>
        dispatch((send, getState) => {
          send({
            type: 'REQUEST_UNITS_SUCCESS',
            payload: [{ id: 1, name: getState().auth.token || 'Anonymous' }],
          } satisfies AuthAction);
        })
      }
    >
      Load {token || 'anonymous'}
    </button>
  );
}

describe('typed Redux UI', () => {
  it('derives auth state and thunk dispatch types from the consuming app', () => {
    expectTypeOf<RootState['auth']>().toEqualTypeOf<AuthState>();
    expectTypeOf<RootState>().not.toBeAny();
    expectTypeOf<ReturnType<typeof useAppDispatch>>().toEqualTypeOf<AppDispatch>();
  });

  it('renders selected names in store order and responds to state updates', () => {
    const store = createStore(combineReducers({ auth: authReducer }), applyMiddleware(thunk));
    const { container } = render(
      <Provider store={store}>
        <UnitNamesLabels units={[2, 1]} />
      </Provider>,
    );
    expect(container.textContent).toBe('');
    act(() => {
      store.dispatch({
        type: 'REQUEST_UNITS_SUCCESS',
        payload: [
          { id: 1, name: 'Residents' },
          { id: 3, name: 'Hidden' },
          { id: 2, name: 'Staff' },
        ],
      });
    });
    expect(container.textContent).toBe('Residents, Staff');
    act(() => {
      store.dispatch({ type: 'REQUEST_UNITS_SUCCESS', payload: null });
    });
    expect(container.textContent).toBe('');
  });

  it('defaults to an empty selection', () => {
    const store = createStore(combineReducers({ auth: authReducer }));
    store.dispatch({ type: 'REQUEST_UNITS_SUCCESS', payload: [{ id: 1, name: 'Residents' }] });
    const { container } = render(
      <Provider store={store}>
        <UnitNamesLabels />
      </Provider>,
    );
    expect(container.textContent).toBe('');
  });

  it('dispatches thunks with typed state through the existing middleware', () => {
    const store = createStore(combineReducers({ auth: authReducer }), applyMiddleware(thunk));
    store.dispatch({ type: 'AUTH_SET_TOKEN', payload: 'test-token' });
    render(
      <Provider store={store}>
        <LoadUnits />
        <UnitNamesLabels units={[1]} />
      </Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load test-token' }));
    expect(screen.getByText('test-token')).toBeTruthy();
    expect(store.getState().auth.units).toEqual([{ id: 1, name: 'test-token' }]);
  });
});
