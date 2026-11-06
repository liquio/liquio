import { RedirectController } from './redirect';
import { getConfig, resetAppContext, setAppContext } from '../lib/context';

describe('RedirectController', () => {
  afterEach(() => resetAppContext());

  const authRedirectUrl = 'http://task.local/auth';
  let controller: RedirectController;
  let redirect: jest.SpyInstance;

  const build = (liquioId: Record<string, any>) => {
    (RedirectController as any).singleton = undefined;
    setAppContext({ config: { auth: { authRedirectUrl, LiquioId: liquioId } } });
    controller = new RedirectController(getConfig());
    redirect = jest.spyOn(controller, 'redirect').mockImplementation(() => undefined as any);
  };

  describe('auth', () => {
    it('should redirect to the id front with the default authorise route', async () => {
      build({ server: 'http://id-api', front: 'http://id.local', clientId: 'task' });

      await controller.auth({ query: {} }, {});

      expect(redirect).toHaveBeenCalledWith({}, `http://id.local/authorise?redirect_uri=${encodeURIComponent(authRedirectUrl)}&client_id=task`);
    });

    it('should use the id server and the configured route and pass the state', async () => {
      build({ server: 'http://id-api', clientId: 'task', routes: { getCode: '/custom/authorise' } });

      await controller.auth({ query: { state: 'abc' } }, {});

      expect(redirect).toHaveBeenCalledWith(
        {},
        `http://id-api/custom/authorise?redirect_uri=${encodeURIComponent(authRedirectUrl)}&client_id=task&state=abc`,
      );
    });
  });

  it('preserves callback query parameters and state as individual values', async () => {
    build({ front: 'https://id.example', clientId: 'task&client' });
    getConfig().auth.authRedirectUrl = 'https://cabinet.example/?a=1&b=2';
    await controller.auth({ query: { state: 'state&=+' } }, {});
    const location = new URL(redirect.mock.calls[0][1]);
    expect(location.searchParams.get('redirect_uri')).toBe('https://cabinet.example/?a=1&b=2');
    expect(location.searchParams.get('state')).toBe('state&=+');
    expect(location.searchParams.get('client_id')).toBe('task&client');
  });

  describe('logout', () => {
    it('should redirect to the configured logout route of the id front', async () => {
      build({ server: 'http://id-api', front: 'http://id.local', routes: { logout: '/logout' } });

      await controller.logout({ query: { state: 'abc' } }, {});

      expect(redirect).toHaveBeenCalledWith({}, `http://id.local/logout?redirect_uri=${authRedirectUrl}&state=abc`);
    });
  });
});
