import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExportReport from './ExportReport';

const { print } = vi.hoisted(() => ({ print: vi.fn() }));

vi.mock('react-translate', () => ({
  translate: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} t={(key: string) => key} />
  )
}));
vi.mock('hooks/withAuthorization', () => ({ default: (Component: unknown) => Component }));
vi.mock('html-to-printer', () => ({ print }));

const gate = () => {
  let release: (value: unknown) => void = () => undefined;
  const promise = new Promise((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

const row = (n: number) => ({ createdAt: '2024-01-01T00:00:00Z', ip: ['127.0.0.1', `10.0.0.${n}`], n });

const renderReport = (loadAllDataRequests: () => Array<() => Promise<unknown>>) =>
  render(
    <ExportReport
      actions={{ loadAllDataRequests }}
      filters={{ some: 'filter' }}
      count={10}
      columns={[{ id: 'a' }]}
      hiddenColumns={[]}
      userInfo={{ name: 'Ivan Petrov' }}
    />
  );

describe('ExportReport (real queue@7)', () => {
  beforeEach(() => {
    print.mockReset();
    vi.stubGlobal('fetch', vi.fn(async () => ({ text: async () => '<table>{{#each logs}}<td>{{ip}}</td>{{/each}}</table>' })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the progress from pending jobs and prints once when the queue ends', async () => {
    const gates = [gate(), gate(), gate()];
    const jobs = gates.map((g, i) => async () => {
      await g.promise;
      return row(i);
    });
    renderReport(() => jobs);

    fireEvent.click(screen.getByRole('button', { name: '' }));
    const bar = await screen.findByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');

    gates[0].release(undefined);
    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67'));

    gates[1].release(undefined);
    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100'));
    expect(print).not.toHaveBeenCalled();

    gates[2].release(undefined);
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    const html = print.mock.calls[0][0] as string;
    expect(html).toContain('10.0.0.0');
    expect(html).toContain('10.0.0.2');
    expect(html).not.toContain('127.0.0.1');

    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('cancel stops the export without printing and a later export still works', async () => {
    const g = gate();
    const second = vi.fn(async () => row(1));
    renderReport(() => [async () => g.promise, second]);

    fireEvent.click(screen.getByRole('button', { name: '' }));
    await screen.findByRole('progressbar');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    g.release(undefined);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(print).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();

    renderReport(() => [async () => row(9)]);
    fireEvent.click(screen.getAllByRole('button', { name: '' })[1]);
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
  });

  it('does not react to queue events after unmount (listeners cleared)', async () => {
    const g = gate();
    const { unmount } = renderReport(() => [async () => g.promise]);

    fireEvent.click(screen.getByRole('button', { name: '' }));
    await screen.findByRole('progressbar');
    unmount();

    g.release(row(1));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(print).not.toHaveBeenCalled();
  });
});
