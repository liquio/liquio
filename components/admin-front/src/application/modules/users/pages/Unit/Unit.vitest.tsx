import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/styles';
import { createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Unit from './index';

const { unitActions, actualUnitList, userInfo, userUnits, callback } = vi.hoisted(() => ({
  // stable references: the page re-renders on prop identity changes
  userInfo: {},
  userUnits: [] as unknown[],
  callback: vi.fn(),
  actualUnitList: {
    u1: { id: 'u1', name: 'Unit', membersIpn: [], headsIpn: [], members: [] }
  } as Record<string, unknown>,
  unitActions: {
    requestUnit: vi.fn(),
    updateUnitData: vi.fn(),
    saveUnit: vi.fn(),
    addUnitHeads: vi.fn(),
    deleteUnitHeads: vi.fn(),
    addUnitMembers: vi.fn(),
    deleteUnitMembers: vi.fn(),
    addMessage: vi.fn(),
    deleteFavorites: vi.fn(),
    addFavorites: vi.fn(),
    getFavoritesById: vi.fn()
  }
}));

vi.mock('react-translate', () => ({
  translate: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} t={(key: string) => key} />
  )
}));
vi.mock('react-redux', () => ({
  connect: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component
      {...props}
      unitActions={unitActions}
      actualUnitList={actualUnitList}
      originUnitList={actualUnitList}
      userInfo={userInfo}
      userUnits={userUnits}
    />
  )
}));
vi.mock('store', () => ({ history: { replace: vi.fn() } }));
vi.mock('core/helpers/configLoader', () => ({ getConfig: () => ({ application: { environment: 'test' } }), loadConfig: async () => ({}) }));
vi.mock('services/dataTable/connect', () => ({ default: () => (Component: unknown) => Component }));
vi.mock('application/endPoints/unitListControl', () => ({ default: {} }));
vi.mock('application/actions/units', () => ({ requestUnit: vi.fn(), updateUnitData: vi.fn(), saveUnit: vi.fn() }));
vi.mock('actions/units', () => ({
  addUnitHeads: vi.fn(),
  deleteUnitHeads: vi.fn(),
  addUnitMembers: vi.fn(),
  deleteUnitMembers: vi.fn()
}));
vi.mock('actions/error', () => ({ addMessage: vi.fn() }));
vi.mock('actions/favorites', () => ({ addFavorites: vi.fn(), deleteFavorites: vi.fn(), getFavoritesById: vi.fn() }));
vi.mock('components/Snackbars/Message', () => ({
  default: class {
    constructor(
      public text: string,
      public type: string
    ) {}
  }
}));
vi.mock('components/JsonSchema', () => ({
  SchemaForm: () => null,
  validateData: () => [],
  handleChangeAdapter: () => () => undefined
}));
vi.mock('components/JsonSchema/elements/StringElement', () => ({ default: () => null }));
vi.mock('components/ConfirmDialog', () => ({ default: () => null }));
vi.mock('components/ChipTabs', () => ({ default: () => null }));
vi.mock('components/Preloader', () => ({ default: () => <div>preloader</div> }));
vi.mock('layouts/LeftSidebar', () => ({ default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div> }));
vi.mock('helpers/checkAccess', () => ({ default: () => true }));
vi.mock('./components/UnitList', () => ({ default: () => null }));
vi.mock('./components/InterfacePart', () => ({ default: () => null }));
vi.mock('./components/BlocksAccess', () => ({ default: () => null }));
vi.mock('./components/UsersPart', () => ({
  default: ({ addAction }: { addAction: (params: { userId: string; path: string[]; callback: (data: unknown) => void }) => void }) => (
    <button onClick={() => addAction({ userId: 'user1', path: ['members'], callback })}>add member</button>
  )
}));

const mount = (unitId = 'u1') =>
  render(
    <ThemeProvider theme={createTheme()}>
      <Unit match={{ params: { unitId } }} location={{ pathname: '/units/u1' }} title="unit" />
    </ThemeProvider>
  );

describe('Unit page queue (real queue@7)', () => {
  beforeEach(() => {
    Object.values(unitActions).forEach((fn) => fn.mockReset());
    callback.mockReset();
    unitActions.getFavoritesById.mockResolvedValue({});
    unitActions.requestUnit.mockResolvedValue({ members: [{ id: 'user1' }] });
    unitActions.addUnitMembers.mockResolvedValue({});
  });

  it('runs the add action through the queue, reloads the unit on end and hands the new list to the callback', async () => {
    mount();
    await waitFor(() => expect(unitActions.requestUnit).toHaveBeenCalledTimes(1));

    fireEvent.click(await screen.findByRole('button', { name: 'add member' }));

    await waitFor(() => expect(unitActions.addUnitMembers).toHaveBeenCalledWith('u1', ['user1']));
    await waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
    expect(callback).toHaveBeenCalledWith([{ id: 'user1' }]);
    // 1 on mount + 1 from the 'end' handler
    expect(unitActions.requestUnit).toHaveBeenCalledTimes(2);
    expect(unitActions.addMessage).toHaveBeenCalledWith(expect.objectContaining({ text: 'AddingUserSuccess' }));
  });

  it('replaces the end handler when the page is created again for the same unit', async () => {
    mount();
    mount();
    await waitFor(() => expect(unitActions.requestUnit).toHaveBeenCalledTimes(2));
    unitActions.requestUnit.mockClear();

    fireEvent.click((await screen.findAllByRole('button', { name: 'add member' }))[0]);

    await waitFor(() => expect(unitActions.addUnitMembers).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(unitActions.requestUnit).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 30));
    // only the latest page instance reloads the unit when the queue ends
    expect(unitActions.requestUnit).toHaveBeenCalledTimes(1);
  });
});
