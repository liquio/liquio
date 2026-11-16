import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/styles';
import { createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import KeyList from './index';

const { dispatch, syncCount, userUnits, userInfo } = vi.hoisted(() => ({
  // stable references: the page re-runs effects when these change identity
  userInfo: {},
  userUnits: [] as unknown[],
  syncCount: vi.fn(),
  dispatch: vi.fn()
}));
dispatch.mockImplementation((action: unknown) => action);

vi.mock('react-translate', () => ({
  translate: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} t={(key: string) => key} />
  )
}));
vi.mock('react-redux', () => ({
  connect: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} userInfo={userInfo} userUnits={userUnits} />
  ),
  useDispatch: () => dispatch
}));
vi.mock('hooks/asModulePage', () => ({ default: (Component: unknown) => Component }));
vi.mock('services/dataTable/connect', () => ({ default: () => (Component: unknown) => Component }));
vi.mock('services/dataTable/adapter', () => ({ default: () => ({}) }));
vi.mock('application/endPoints/registryKeyList', () => ({ default: {} }));
vi.mock('./variables/dataTableSettings', () => ({ default: () => ({}) }));
vi.mock('helpers/checkAccess', () => ({ default: () => true }));
vi.mock('helpers/renderOneLine', () => ({ default: () => null }));
vi.mock('actions/registry', () => ({ getSynchronizationCount: (ids: string) => syncCount(ids) }));
vi.mock('layouts/LeftSidebar', () => ({
  default: ({ children, loading }: { children?: React.ReactNode; loading?: boolean }) => (
    <div data-testid="layout" data-loading={String(!!loading)}>
      {children}
    </div>
  )
}));
vi.mock('components/DataTable', () => ({
  default: ({ data }: { data: Array<{ id: string; sync?: unknown }> }) => (
    <ul>
      {data.map(({ id, sync }) => (
        <li key={id}>{`${id}:${JSON.stringify(sync ?? null)}`}</li>
      ))}
    </ul>
  )
}));
vi.mock('./components/CreateNewKey', () => ({ default: () => null }));
vi.mock('./components/KeyActions/ImportRegisterKeys', () => ({ default: () => null }));
vi.mock('./components/KeyActions/ExportRegisterKeys', () => ({ default: () => null }));
vi.mock('./../RegistryList/components/ImportRegistersKeysXLS', () => ({ default: () => null }));

const gate = () => {
  let release: (value: unknown) => void = () => undefined;
  const promise = new Promise((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

const actions = {
  getRegister: vi.fn(async () => ({ name: 'Reg' })),
  onFilterChange: vi.fn()
};

const element = (data: Array<{ id: string }>) => (
  <ThemeProvider theme={createTheme()}>
    <KeyList registerId="r1" title="t" location={{}} actions={actions} data={data} />
  </ThemeProvider>
);

describe('KeyList synchronization queue (real queue@7)', () => {
  beforeEach(() => {
    syncCount.mockReset();
  });

  it('loads the synchronization count through the queue and shows it per key', async () => {
    syncCount.mockResolvedValue([{ key_id: 'k1', n: 3 }]);
    render(element([{ id: 'k1' }]));

    expect(await screen.findByText('k1:[{"key_id":"k1","n":3}]')).toBeInTheDocument();
    expect(syncCount).toHaveBeenCalledWith('k1');
    await waitFor(() => expect(screen.getByTestId('layout')).toHaveAttribute('data-loading', 'false'));
  });

  it('runs requests for changed data one after another and keeps going after a failed job', async () => {
    const first = gate();
    syncCount
      .mockImplementationOnce(() => first.promise)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([{ key_id: 'k3', n: 1 }]);
    const { rerender } = render(element([{ id: 'k1' }]));
    await waitFor(() => expect(syncCount).toHaveBeenCalledTimes(1));

    rerender(element([{ id: 'k2' }]));
    rerender(element([{ id: 'k3' }]));
    await new Promise((resolve) => setTimeout(resolve, 30));
    // the later requests wait for the first one
    expect(syncCount).toHaveBeenCalledTimes(1);

    first.release([{ key_id: 'k1', n: 9 }]);

    await waitFor(() => expect(syncCount).toHaveBeenCalledTimes(3));
    expect(syncCount.mock.calls.map(([ids]) => ids)).toEqual(['k1', 'k2', 'k3']);
    expect(await screen.findByText('k3:[{"key_id":"k3","n":1}]')).toBeInTheDocument();
  });
});
