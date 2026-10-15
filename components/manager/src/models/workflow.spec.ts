describe('WorkflowModel.appendMessage', () => {
  let workflowModel;
  const query = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    query.mockReset();
    (global as any).db = { define: jest.fn().mockReturnValue({}), query };
    const { WorkflowModel } = require('./workflow');
    workflowModel = new WorkflowModel();
  });

  it('passes the message as a bind parameter, not in SQL text', async () => {
    const message = { name: "O'Brien'); DROP TABLE workflows;--" };
    query.mockResolvedValue([{ id: 'wf-1', workflow_template_id: 5, is_final: false, data: { messages: [message] } }]);

    const result = await workflowModel.appendMessage('wf-1', message);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, options] = query.mock.calls[0];
    expect(sql).not.toContain('Brien');
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).toContain('$1::jsonb');
    expect(sql).toContain('$2');
    expect(options.bind).toEqual([JSON.stringify(message), 'wf-1']);
    expect(result.id).toBe('wf-1');
    expect(result.workflowTemplateId).toBe(5);
    expect(result.isFinal).toBe(false);
    expect(result.data).toEqual({ messages: [message] });
  });

  it('returns undefined when no single row is updated', async () => {
    query.mockResolvedValue([]);
    expect(await workflowModel.appendMessage('wf-1', { a: 1 })).toBeUndefined();
  });
});
