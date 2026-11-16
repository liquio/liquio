import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/styles';
import { createTheme } from '@mui/material/styles';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExportRegisterKeys from './ExportRegisterKeys';

const { importActions, downloadBase64Attach } = vi.hoisted(() => ({
  downloadBase64Attach: vi.fn(),
  importActions: {
    checkExportPreparingStatus: vi.fn(),
    downloadPreparedRegister: vi.fn(),
    startPreparingExport: vi.fn(),
    addMessage: vi.fn()
  }
}));

vi.mock('react-translate', () => ({ useTranslate: () => (key: string) => key }));
vi.mock('react-redux', () => ({
  connect: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} importActions={importActions} />
  )
}));
vi.mock('components/Preloader', () => ({ default: () => <div>preloader</div> }));
vi.mock('components/JsonSchema', () => ({ SchemaForm: () => null, handleChangeAdapter: () => () => undefined }));
vi.mock('components/Snackbars/Message', () => ({
  default: class {
    constructor(
      public text: string,
      public type: string
    ) {}
  }
}));
vi.mock('helpers/downloadBase64Attach', () => ({ default: downloadBase64Attach }));
vi.mock('application/actions/registry', () => ({
  checkExportPreparingStatus: vi.fn(),
  downloadPreparedRegister: vi.fn(),
  startPreparingExport: vi.fn()
}));
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

const mount = () =>
  render(
    <ThemeProvider theme={createTheme()}>
      <ExportRegisterKeys
        registerId="reg1"
        ColorButton={ColorButton}
        data={[
          { id: 'k1', name: 'one' },
          { id: 'k2', name: 'two' }
        ]}
      />
    </ThemeProvider>
  );

const startExport = () => {
  fireEvent.click(screen.getByRole('button', { name: /ExportRegister$/ }));
  screen.getAllByRole('checkbox').forEach((checkbox) => fireEvent.click(checkbox));
  fireEvent.click(screen.getByRole('button', { name: 'Export' }));
};

describe('ExportRegisterKeys queue (real queue@7)', () => {
  beforeEach(() => {
    Object.values(importActions).forEach((fn) => fn.mockReset());
    downloadBase64Attach.mockReset();
    // only the status polling interval is faked, the queue and RTL keep using real timers
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prepares keys sequentially and reports the success message once, after the last key is downloaded', async () => {
    const first = gate();
    importActions.startPreparingExport
      .mockImplementationOnce(async () => first.promise)
      .mockResolvedValueOnce({ exportId: 'e2' });
    importActions.checkExportPreparingStatus.mockResolvedValue({ status: 'Prepared' });
    importActions.downloadPreparedRegister.mockResolvedValue(new Blob(['x']));
    mount();

    startExport();

    await waitFor(() => expect(importActions.startPreparingExport).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 30));
    // the second key waits for the first one
    expect(importActions.startPreparingExport).toHaveBeenCalledTimes(1);

    first.release({ exportId: 'e1' });
    await waitFor(() => expect(importActions.startPreparingExport).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 30));

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    await waitFor(() => expect(importActions.downloadPreparedRegister).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(importActions.addMessage).toHaveBeenCalledTimes(1));
    expect(importActions.addMessage.mock.calls[0][0]).toMatchObject({ text: 'ExportRegistersSuccess', type: 'success' });
    expect(downloadBase64Attach).toHaveBeenCalledTimes(2);
  });

  it('reports a failed start and still processes the next key', async () => {
    importActions.startPreparingExport.mockResolvedValueOnce(new Error('fail')).mockResolvedValueOnce({ exportId: 'e2' });
    importActions.checkExportPreparingStatus.mockResolvedValue({ status: 'Prepared' });
    importActions.downloadPreparedRegister.mockResolvedValue(new Blob(['x']));
    mount();

    startExport();

    await waitFor(() => expect(importActions.startPreparingExport).toHaveBeenCalledTimes(2));
    expect(importActions.addMessage.mock.calls[0][0]).toMatchObject({ text: 'FailExportingRegisters', type: 'error' });

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    await waitFor(() => expect(importActions.downloadPreparedRegister).toHaveBeenCalledWith('e2'));
    await waitFor(() => expect(importActions.addMessage).toHaveBeenCalledTimes(2));
    expect(importActions.addMessage.mock.calls[1][0]).toMatchObject({ text: 'ExportRegistersSuccess' });
  });
});
