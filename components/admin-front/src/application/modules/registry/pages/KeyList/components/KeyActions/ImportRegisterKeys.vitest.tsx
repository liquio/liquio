import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/styles';
import { createTheme } from '@mui/material/styles';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImportRegisterKeys from './ImportRegisterKeys';

const { addMessage, checkImportPreparingStatus, readFileAsync } = vi.hoisted(() => ({
  addMessage: vi.fn(),
  checkImportPreparingStatus: vi.fn(),
  readFileAsync: vi.fn()
}));

vi.mock('react-translate', () => ({ useTranslate: () => (key: string) => key }));
vi.mock('react-redux', () => ({
  connect: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} actions={{ addMessage }} />
  ),
  useDispatch: () => (action: unknown) => action
}));
vi.mock('components/Preloader', () => ({ default: () => <div>preloader</div> }));
vi.mock('components/Snackbars/Message', () => ({ default: class {} }));
vi.mock('helpers/renderOneLine', () => ({ default: ({ title }: { title: string }) => <span>{title}</span> }));
vi.mock('helpers/parseFile', () => ({ readFileAsync }));
vi.mock('helpers/storage', () => ({ default: { getItem: () => 'token' } }));
vi.mock('services/api', () => ({ getApiUrl: () => 'http://api/' }));
vi.mock('application/actions/registry', () => ({ checkImportPreparingStatus: (id: string) => checkImportPreparingStatus(id) }));
vi.mock('actions/error', () => ({ addMessage: vi.fn() }));

const ColorButton = ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
  <button onClick={onClick}>{children}</button>
);

const gate = () => {
  let release: (value: unknown) => void = () => undefined;
  const promise = new Promise((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

const response = (importId: string) => ({ status: 200, json: async () => ({ data: { importId } }) });

describe('ImportRegisterKeys queue (real queue@7)', () => {
  beforeEach(() => {
    addMessage.mockReset();
    checkImportPreparingStatus.mockReset();
    readFileAsync.mockReset();
    readFileAsync.mockImplementation(async (file: File) => ({
      key: { id: file.name, name: `key ${file.name}` },
      register: { id: 'reg', name: 'Register' }
    }));
    // only the status polling interval is faked, the queue and RTL keep using real timers
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('imports selected key files one by one and polls the status of each import through the queue', async () => {
    const first = gate();
    const started: string[] = [];
    const fetchMock = vi.fn(async (_url: string, init: { body: File }) => {
      started.push(init.body.name);
      if (init.body.name === 'a.dat') await first.promise;
      return response(`import-${init.body.name}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    checkImportPreparingStatus.mockImplementation(async (importId: string) => ({ importId, status: 'Imported', details: {} }));
    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <ImportRegisterKeys ColorButton={ColorButton} />
      </ThemeProvider>
    );

    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['1'], 'a.dat'), new File(['2'], 'b.dat')] } });
    fireEvent.click(await screen.findByRole('button', { name: 'ImportRegisters' }));

    await waitFor(() => expect(started).toEqual(['a.dat']));
    await new Promise((resolve) => setTimeout(resolve, 30));
    // the second upload waits for the first one
    expect(started).toEqual(['a.dat']);

    first.release(undefined);
    await waitFor(() => expect(started).toEqual(['a.dat', 'b.dat']));
    await new Promise((resolve) => setTimeout(resolve, 30));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(checkImportPreparingStatus.mock.calls.map(([id]) => id).sort()).toEqual(['import-a.dat', 'import-b.dat']));
    await waitFor(() => expect(screen.queryByText('ProcessingImport')).not.toBeInTheDocument());
  });

  it('keeps the queue running when an upload is rejected by the server', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 500 })
      .mockResolvedValueOnce(response('import-b.dat'));
    vi.stubGlobal('fetch', fetchMock);
    checkImportPreparingStatus.mockImplementation(async (importId: string) => ({ importId, status: 'Imported', details: {} }));
    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <ImportRegisterKeys ColorButton={ColorButton} />
      </ThemeProvider>
    );

    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['1'], 'a.dat'), new File(['2'], 'b.dat')] } });
    fireEvent.click(await screen.findByRole('button', { name: 'ImportRegisters' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    await waitFor(() => expect(checkImportPreparingStatus).toHaveBeenCalledWith('import-b.dat'));
  });
});
