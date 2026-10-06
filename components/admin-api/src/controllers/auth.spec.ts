import { createIdApiClient, getIdApiClient } from '@liquio/back-core';

import { AuthController } from './auth';

jest.mock('@liquio/back-core', () => ({ ...jest.requireActual('@liquio/back-core'), getIdApiClient: jest.fn() }));
jest.mock('../businesses/unit', () => ({ UnitBusiness: jest.fn() }));
jest.mock('../lib/token', () => ({ Token: jest.fn() }));

describe('AuthController.me', () => {
  let controller: AuthController;
  let responseData: jest.SpyInstance;

  beforeEach(() => {
    (AuthController as any).singleton = undefined;
    (getIdApiClient as jest.Mock).mockReturnValue(createIdApiClient({ server: 'http://id.local', port: 8100 }));
    controller = new AuthController({ auth: { server: 'http://id.local' }, server: { token: 't' }, access: {} });
    responseData = jest.spyOn(controller, 'responseData').mockImplementation(() => undefined);
  });

  it('should not prefix an already full avatar URL again', async () => {
    const authUserInfo = { userId: 'u1', avaUrl: 'http://id.local:8100/ava/u1.png' };

    await controller.me({ authUserInfo, authUserRoles: ['admin'], authUserUnitIds: [1] }, {});

    const data = responseData.mock.calls[0][1];
    expect(data.fullAvaUrl).toBe('http://id.local:8100/ava/u1.png');
    expect(data.avaUrl).toBe('http://id.local:8100/ava/u1.png');
  });

  it('should respond with an empty avatar URL when the user has none', async () => {
    await controller.me({ authUserInfo: { userId: 'u1', avaUrl: '' }, authUserRoles: [], authUserUnitIds: [] }, {});

    const data = responseData.mock.calls[0][1];
    expect(data.fullAvaUrl).toBe('');
    expect(data.avaUrl).toBe('');
  });
});
