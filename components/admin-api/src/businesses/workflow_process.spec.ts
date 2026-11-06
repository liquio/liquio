import axios from 'axios';

import { WorkflowProcessBusiness } from './workflow_process';

jest.mock('axios', () => jest.fn());
jest.mock('@liquio/back-core', () => ({ ...jest.requireActual('@liquio/back-core'), getIdApiClient: jest.fn() }));

describe('WorkflowProcessBusiness.getAllElasticFiltered logging', () => {
  const config = {
    elastic: {
      protocol: 'https',
      host: 'user:pass@elastic.local:9200',
      uri: '/idx/_search?token=secret',
      method: 'POST',
      headers: { Authorization: 'Basic dGVzdDp0ZXN0' },
    },
  };
  let save: jest.Mock;

  beforeEach(() => {
    save = jest.fn();
    (global as any).log = { save };
  });

  const run = async () => {
    const business = Object.create(WorkflowProcessBusiness.prototype);
    business.config = config;
    await business.getAllElasticFiltered({ page: 1, count: 1 }).catch(() => undefined);
  };

  const assertClean = () => {
    expect(save).toHaveBeenCalled();
    const logged = JSON.stringify(save.mock.calls);
    expect(logged).not.toMatch(/Authorization|headers|dGVzdDp0ZXN0|user:pass|token=secret/);
  };

  it('does not log headers or credentials on success', async () => {
    (axios as unknown as jest.Mock).mockResolvedValue({ status: 200, data: {} });
    await run();
    assertClean();
  });

  it('does not log headers or credentials on error status and exception', async () => {
    (axios as unknown as jest.Mock).mockResolvedValueOnce({ status: 500, statusText: 'err' });
    await run();
    assertClean();
    save.mockClear();
    (axios as unknown as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await run();
    assertClean();
  });
});
