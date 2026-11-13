import { WorkflowErrorModel } from './workflow_error';
import { setAppContext, resetAppContext } from '../lib/context';

describe('WorkflowErrorModel.create', () => {
  let model: any;
  const create = jest.fn();

  beforeAll(() => {
    setAppContext({ db: { define: () => ({ prototype: {}, create }) }, config: {} });
    model = new WorkflowErrorModel();
  });

  afterAll(() => {
    resetAppContext();
  });

  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ id: 5 });
  });

  it('skips rows without a workflow id when the option is not given', async () => {
    await expect(model.create({ error: 'x', queueMessage: { taskId: 't' } })).resolves.toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });

  it('derives the workflow id from the message when the option is not given and returns the row id', async () => {
    await expect(model.create({ error: 'x', queueMessage: { workflowId: 'w1' } }, 'warning')).resolves.toBe(5);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ workflow_id: 'w1', service_name: 'task', type: 'warning' }));
  });

  it('uses the given workflow id as is and ignores the one in the message', async () => {
    await model.create({ error: 'x', queueMessage: { workflowId: 'planted' } }, 'error', { workflowId: 'trusted' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ workflow_id: 'trusted' }));
  });

  it('stores an unlinked row for a null workflow id', async () => {
    await expect(model.create({ error: 'x', queueMessage: { workflowId: 'planted' } }, 'error', { workflowId: null })).resolves.toBe(5);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ workflow_id: null }));
  });

  it('still skips suppressed errors', async () => {
    await expect(model.create({ error: 'NotFoundError: Task not found.' }, 'error', { workflowId: null })).resolves.toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });
});
