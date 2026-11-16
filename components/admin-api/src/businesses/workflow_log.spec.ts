import { resetAppContext, setAppContext } from '../lib/context';
import { WorkflowLogBusiness } from './workflow_log';

describe('WorkflowLogBusiness.reindexWorkflowProcesses queue', () => {
  let save: jest.Mock;
  let business;

  beforeEach(() => {
    save = jest.fn();
    setAppContext({ log: { save }, config: { elastic: { reindexQueueConcurrency: 2 } } });
    business = Object.create(WorkflowLogBusiness.prototype);
  });

  afterEach(() => {
    resetAppContext();
  });

  it('runs every process and resolves on end', async () => {
    const done: number[] = [];
    business.reindexWorkflowProcess = jest.fn(async (p) => {
      done.push(p.id);
    });

    await business.reindexWorkflowProcesses([{ id: 1 }, { id: 2 }, { id: 3 }]);

    expect(done.sort()).toEqual([1, 2, 3]);
    expect(business.reindexWorkflowProcess).toHaveBeenCalledWith({ id: 1 }, { processesLength: 3, processIndex: '0' });
    expect(save).toHaveBeenCalledWith('reindex-workflow-processes|job-done', expect.anything(), 'info');
  });

  it('respects configured concurrency', async () => {
    let running = 0;
    let max = 0;
    business.reindexWorkflowProcess = jest.fn(async () => {
      running++;
      max = Math.max(max, running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
    });

    await business.reindexWorkflowProcesses([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);

    expect(max).toBe(2);
  });

  it('rejects when a job throws', async () => {
    business.reindexWorkflowProcess = jest.fn(async () => {
      throw new Error('boom');
    });

    await expect(business.reindexWorkflowProcesses([{ id: 1 }])).rejects.toThrow('boom');
  });
});
