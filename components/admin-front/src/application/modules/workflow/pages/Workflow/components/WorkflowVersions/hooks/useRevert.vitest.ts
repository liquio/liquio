import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import queueFactory from 'helpers/queueFactory';
import useRevert from './useRevert';

const { getChanges, revertHandlers } = vi.hoisted(() => ({
  getChanges: vi.fn(),
  revertHandlers: vi.fn()
}));

vi.mock('modules/workflow/pages/Workflow/components/WorkflowVersions/helpers/getChanges', () => ({ default: getChanges }));
vi.mock('modules/workflow/pages/Workflow/components/WorkflowVersions/revertHandlers', () => ({ default: revertHandlers }));

let seq = 0;
const nextVersions = () => {
  seq += 1;
  return [{ version: `cur${seq}` }, { version: `rev${seq}` }] as const;
};

const t = (key: string) => key;

describe('useRevert (real queue@7)', () => {
  beforeEach(() => {
    getChanges.mockReset();
    revertHandlers.mockReset();
  });

  it('is busy while jobs run, reports progress and calls onRevert last', async () => {
    const changes = [
      { id: 1, type: 'task', data: { name: 'first' } },
      { id: 2, type: 'task', data: { name: 'second' } }
    ];
    getChanges.mockReturnValue(changes);
    const order: string[] = [];
    revertHandlers.mockImplementation((change) => async () => {
      order.push(`change-${change.id}`);
      return change;
    });
    const onRevert = vi.fn(async () => {
      order.push('onRevert');
      return { name: 'done' };
    });
    const [cur, rev] = nextVersions();

    const { result } = renderHook(() => useRevert(cur, rev, { t, workflowId: 'w', onRevert }));
    expect(result.current.active).toBe(true);

    act(() => result.current.start());
    await waitFor(() => expect(order).toEqual(['change-1', 'change-2', 'onRevert']));
    await waitFor(() => expect(result.current.busy).toBe(false));

    expect(result.current.progress).toBeUndefined();
    expect(result.current.progressText).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it('exposes the success payload (detail.result[0]) as progress text', async () => {
    getChanges.mockReturnValue([{ id: 1, type: 'task', data: { taskTemplateEntity: { name: 'Template' } } }]);
    const seen: unknown[] = [];
    revertHandlers.mockImplementation((change) => async () => {
      seen.push(change);
      return change;
    });
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const onRevert = vi.fn(async () => {
      await gate;
      return { name: 'final' };
    });
    const [cur, rev] = nextVersions();

    const { result } = renderHook(() => useRevert(cur, rev, { t, workflowId: 'w', onRevert }));
    act(() => result.current.start());

    await waitFor(() => expect(result.current.busy).toBe(true));
    await waitFor(() => expect(result.current.progressText).toBe('Template'));
    // onRevert is still queued, so the last change reports 0% of the remaining work
    expect(result.current.progress).toBe(0);

    release();
    await waitFor(() => expect(result.current.busy).toBe(false));
  });

  it('ignores a job resolving undefined without throwing', async () => {
    getChanges.mockReturnValue([{ id: 1, type: 'task', data: { name: 'first' } }]);
    revertHandlers.mockImplementation((change) => async () => change);
    const onRevert = vi.fn(async () => undefined);
    const [cur, rev] = nextVersions();

    const { result } = renderHook(() => useRevert(cur, rev, { t, workflowId: 'w', onRevert }));
    act(() => result.current.start());

    await waitFor(() => expect(onRevert).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.error).toBeUndefined();
  });

  it('captures the error from detail.error and keeps running the remaining jobs', async () => {
    getChanges.mockReturnValue([
      { id: 1, type: 'task', data: { name: 'bad' } },
      { id: 2, type: 'task', data: { name: 'good' } }
    ]);
    const boom = new Error('revert failed');
    const ran: number[] = [];
    revertHandlers.mockImplementation((change) => async () => {
      ran.push(change.id);
      if (change.id === 1) throw boom;
      return change;
    });
    const onRevert = vi.fn(async () => ({ name: 'done' }));
    const [cur, rev] = nextVersions();

    const { result } = renderHook(() => useRevert(cur, rev, { t, workflowId: 'w', onRevert }));
    act(() => result.current.start());

    await waitFor(() => expect(result.current.error).toBe(boom));
    await waitFor(() => expect(onRevert).toHaveBeenCalledTimes(1));
    expect(ran).toEqual([1, 2]);
  });

  it('does not stack listeners when start is called again', async () => {
    getChanges.mockReturnValue([{ id: 1, type: 'task', data: { name: 'one' } }]);
    revertHandlers.mockImplementation((change) => async () => change);
    const onRevert = vi.fn(async () => ({ name: 'done' }));
    const [cur, rev] = nextVersions();
    const queue = queueFactory.get([cur.version, rev.version].join());
    const addSpy = vi.spyOn(queue, 'addEventListener');
    const removeSpy = vi.spyOn(queue, 'removeEventListener');

    const { result } = renderHook(() => useRevert(cur, rev, { t, workflowId: 'w', onRevert }));

    for (let run = 1; run <= 3; run += 1) {
      act(() => result.current.start());
      await waitFor(() => expect(onRevert).toHaveBeenCalledTimes(run));
      await waitFor(() => expect(result.current.busy).toBe(false));
    }

    // each start() adds 4 listeners and removes the previous generation
    expect(addSpy).toHaveBeenCalledTimes(12);
    expect(removeSpy).toHaveBeenCalledTimes(8);
  });

  it('is inactive without versions and start is a no-op', () => {
    getChanges.mockReturnValue([]);
    const onRevert = vi.fn();
    const { result } = renderHook(() => useRevert(undefined, undefined, { t, workflowId: 'w', onRevert }));

    expect(result.current.active).toBe(false);
    act(() => result.current.start());
    expect(onRevert).not.toHaveBeenCalled();
  });
});
