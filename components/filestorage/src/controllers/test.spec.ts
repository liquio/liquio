import { TestController } from './test';
import { setAppContext } from '../lib/context';

const mockGetMetadata = jest.fn();
jest.mock('../providers/openstack', () => ({
  OpenStack: jest.fn().mockImplementation(() => ({ getMetadata: mockGetMetadata })),
}));
jest.mock('../lib/preview', () => ({ Preview: jest.fn().mockImplementation(() => ({})) }));

describe('TestController.checkOpenstackProvider', () => {
  let res: any;

  const build = (providers: any) => {
    TestController.singleton = undefined as any;
    return new TestController({ providers });
  };

  beforeEach(() => {
    setAppContext({ log: { save: jest.fn() } });
    mockGetMetadata.mockReset();
    res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
  });

  it('should return 404 when OpenStack is not the active provider', async () => {
    const controller = build({ activeProvider: 'minio', list: { openstack: { container: 'c' } } });
    await controller.checkOpenstackProvider({ query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockGetMetadata).not.toHaveBeenCalled();
  });

  it('should return 404 when OpenStack config is absent', async () => {
    const controller = build({ activeProvider: 'openstack', list: {} });
    await controller.checkOpenstackProvider({ query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should not leak upstream error text on failure', async () => {
    mockGetMetadata.mockRejectedValue(new Error('secret upstream https://internal.host failure'));
    const controller = build({ activeProvider: 'openstack', list: { openstack: { container: 'c' } } });
    await controller.checkOpenstackProvider({ query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.send.mock.calls)).not.toContain('secret upstream');
  });
});
