import { WorkflowErrorModel } from './workflow_error';

jest.mock('./model', () => ({
  Model: class {
    db = { define: jest.fn(() => ({ create: jest.fn() })) };
  },
}));

describe('WorkflowErrorModel.create', () => {
  const model = new WorkflowErrorModel();

  beforeEach(() => {
    model.model.create.mockReset().mockResolvedValue({ id: 5 });
  });

  it('returns the row id and derives the workflow from the message by default', async () => {
    await expect(model.create({ queueMessage: { workflowId: 'w1' } })).resolves.toBe(5);
    expect(model.model.create).toHaveBeenCalledWith(expect.objectContaining({ workflow_id: 'w1', service_name: 'gateway' }));
  });

  it('uses the given workflow id as is, even null', async () => {
    await model.create({ queueMessage: { workflowId: 'w1' } }, { workflowId: null });
    expect(model.model.create).toHaveBeenCalledWith(expect.objectContaining({ workflow_id: null }));
  });
});
