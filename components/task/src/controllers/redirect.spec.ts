import { RedirectController } from './redirect';

describe('RedirectController', () => {
  const authRedirectUrl = 'http://task.local/auth';
  let controller: RedirectController;
  let redirect: jest.SpyInstance;

  const build = (liquioId: Record<string, any>) => {
    (RedirectController as any).singleton = undefined;
    (global as any).config = { auth: { authRedirectUrl, LiquioId: liquioId } };
    controller = new RedirectController((global as any).config);
    redirect = jest.spyOn(controller, 'redirect').mockImplementation(() => undefined as any);
  };

  describe('auth', () => {
    it('should redirect to the id front with the default authorise route', async () => {
      build({ server: 'http://id-api', front: 'http://id.local', clientId: 'task' });

      await controller.auth({ query: {} }, {});

      expect(redirect).toHaveBeenCalledWith({}, `http://id.local/authorise?redirect_uri=${authRedirectUrl}&client_id=task`);
    });

    it('should use the id server and the configured route and pass the state', async () => {
      build({ server: 'http://id-api', clientId: 'task', routes: { getCode: '/custom/authorise' } });

      await controller.auth({ query: { state: 'abc' } }, {});

      expect(redirect).toHaveBeenCalledWith({}, `http://id-api/custom/authorise?redirect_uri=${authRedirectUrl}&client_id=task&state=abc`);
    });
  });

  describe('logout', () => {
    it('should redirect to the configured logout route of the id front', async () => {
      build({ server: 'http://id-api', front: 'http://id.local', routes: { logout: '/logout' } });

      await controller.logout({ query: { state: 'abc' } }, {});

      expect(redirect).toHaveBeenCalledWith({}, `http://id.local/logout?redirect_uri=${authRedirectUrl}&state=abc`);
    });
  });
});
