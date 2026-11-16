import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/styles';
import { createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import SelectFiles from './index';

vi.mock('react-translate', () => ({
  translate: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} t={(key: string) => key} />
  )
}));
vi.mock('components/JsonSchema/components/ElementContainer', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
}));
vi.mock('components/JsonSchema/components/EJVError', () => ({ default: () => null }));
vi.mock('components/FileDataTable', () => ({ default: () => null }));
vi.mock('components/Preloader', () => ({ default: () => <div>preloader</div> }));
vi.mock('./components/FileListPreview', () => ({ default: () => null }));
vi.mock('components/JsonSchema/elements/SelectFiles/components/SelectFileArea', () => ({
  default: ({ onSelect }: { onSelect: (files: File[]) => void }) => (
    <button
      onClick={() =>
        onSelect([new File(['a'], 'a.txt', { type: 'text/plain' }), new File(['b'], 'b.txt', { type: 'text/plain' })])
      }
    >
      drop
    </button>
  )
}));

const gate = () => {
  let release: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

const mount = (taskId: string, actions: Record<string, unknown>, onChange = vi.fn()) =>
  render(
    <ThemeProvider theme={createTheme()}>
      <SelectFiles
        taskId={taskId}
        path={['files']}
        stepName="step1"
        rootDocument={{ data: {} }}
        actions={actions}
        onChange={onChange}
      />
    </ThemeProvider>
  );

describe('SelectFiles upload queue (real queue@7)', () => {
  it('uploads dropped files one after another through the task queue', async () => {
    const first = gate();
    const started: string[] = [];
    const uploadDocumentAttach = vi.fn(async (file: File) => {
      started.push(file.name);
      if (file.name === 'a.txt') await first.promise;
      return { id: file.name, name: file.name, size: 1 };
    });
    const actions = {
      setBusy: vi.fn(),
      handleStore: vi.fn(async () => undefined),
      loadTaskAction: vi.fn(async () => undefined),
      uploadDocumentAttach
    };
    const onChange = vi.fn();
    mount('select-files-seq', actions, onChange);

    fireEvent.click(screen.getByRole('button', { name: 'drop' }));

    await waitFor(() => expect(started).toEqual(['a.txt']));
    // the second job must wait for the first one to finish
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(started).toEqual(['a.txt']);

    await act(async () => first.release());
    await waitFor(() => expect(started).toEqual(['a.txt', 'b.txt']));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
    expect(actions.loadTaskAction).toHaveBeenCalledTimes(2);
  });

  it('drops the loading state when the queue ends', async () => {
    const actions = {
      setBusy: vi.fn(),
      handleStore: vi.fn(async () => undefined),
      loadTaskAction: vi.fn(async () => undefined),
      uploadDocumentAttach: vi.fn(async (file: File) => ({ id: file.name, name: file.name, size: 1 }))
    };
    mount('select-files-end', actions);

    fireEvent.click(screen.getByRole('button', { name: 'drop' }));

    await waitFor(() => expect(actions.uploadDocumentAttach).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('preloader')).not.toBeInTheDocument());
  });
});
