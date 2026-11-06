jest.mock('../../../models/task', () => ({ TaskModel: jest.fn() }));
jest.mock('../../../lib/filestorage', () => ({ FileStorage: jest.fn() }));
jest.mock('@liquio/back-core', () => ({ Sandbox: { getInstance: jest.fn() } }));

import { EventWorkflow } from './index';
import { setAppContext, resetAppContext } from '../../../lib/context';

describe('EventWorkflow external system params not defined', () => {
  const save = jest.fn();

  beforeEach(() => {
    save.mockClear();
    setAppContext({
      log: { save },
      config: { external_bpmn: { sys: { url: '', token: 'fake-token' } } },
    });
  });

  afterEach(() => {
    resetAppContext();
  });

  const expectSafePayload = (payload: any) => {
    expect(payload).not.toHaveProperty('externalSystemConfig');
    expect(JSON.stringify(payload)).not.toContain('fake-token');
    expect(payload.hasToken).toBe(true);
    expect(payload.hasUrl).toBe(false);
  };

  it('createWorkflowsExternal does not log config or token', async () => {
    await expect(
      new EventWorkflow().createWorkflowsExternal({
        createWorkflowsExternal: [{ externalSystem: 'sys', workflowTemplateId: 1, taskTemplateId: 2 }],
        jsonSchemaObject: {},
      }),
    ).rejects.toThrow();
    expect(save).toHaveBeenCalledWith('create-workflow-external-error|external-system-params-not-defined', expect.any(Object));
    expectSafePayload(save.mock.calls[0][1]);
  });

  it('sendStatusExternal does not log config or token', async () => {
    await expect(
      new EventWorkflow().sendStatusExternal({
        sendStatusExternal: { externalSystem: 'sys', workflowId: 'w', taskTemplateId: 2 },
        jsonSchemaObject: {},
      }),
    ).rejects.toThrow();
    expect(save).toHaveBeenCalledWith('send-status-external-error|external-system-params-not-defined', expect.any(Object));
    expectSafePayload(save.mock.calls[0][1]);
  });
});
