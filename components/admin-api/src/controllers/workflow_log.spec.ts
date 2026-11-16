import { resetAppContext, setAppContext } from '../lib/context';
import { WorkflowLogController } from './workflow_log';

describe('WorkflowLogController queue', () => {
  let save: jest.Mock;
  let controller;

  beforeEach(() => {
    save = jest.fn();
    setAppContext({ log: { save } });
    controller = Object.create(WorkflowLogController.prototype);
    controller.initQueue();
  });

  afterEach(() => {
    controller.queue.end();
    resetAppContext();
  });

  it('initializes queue with autostart, concurrency and timeout', () => {
    expect(controller.queue.concurrency).toBe(10);
    expect(controller.queue.timeout).toBe(30 * 60 * 1000);
  });

  it('executes pushed jobs automatically', async () => {
    const job = jest.fn(async () => 'ok');
    await new Promise<void>((resolve) => {
      controller.queue.addEventListener('success', () => resolve(), { once: true });
      controller.queue.push(job);
    });
    expect(job).toHaveBeenCalledTimes(1);
  });

  it('logs and continues on job timeout', async () => {
    controller.queue.timeout = 10;
    const after = jest.fn(async () => undefined);
    await new Promise<void>((resolve) => {
      controller.queue.push(() => new Promise(() => undefined));
      controller.queue.push(after);
      controller.queue.addEventListener('end', () => resolve(), { once: true });
    });
    expect(save).toHaveBeenCalledWith('reindex-workflow-processes|main-reindex-job-timeout', expect.anything(), 'error');
    expect(after).toHaveBeenCalled();
  });
});
