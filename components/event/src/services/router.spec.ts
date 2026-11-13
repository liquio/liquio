import { RouterService } from './router';

jest.mock('../controllers/ping', () => ({
  PingController: class {
    ping() {}
    pingTrembita() {}
    pingStatusRepository() {}
    pingDigestNotifier() {}
    healthz() {}
  },
}));
jest.mock('../controllers/monitor', () => ({
  MonitorController: class {
    system() {}
  },
}));

describe('RouterService.initRoutes', () => {
  it('guards every diagnostic route and leaves /healthz open', () => {
    const routes: Record<string, any[]> = {};
    const app = { get: (path: string, ...handlers: any[]) => (routes[path] = handlers) };
    const router = new RouterService({ server: {}, ping: {} });
    router.initRoutes(app);

    expect(Object.keys(routes).sort()).toEqual(
      ['/healthz', '/monitors/system', '/test/ping', '/test/ping/digest_notifier', '/test/ping/status_repository', '/test/ping/trembita'].sort(),
    );
    for (const path of Object.keys(routes)) {
      expect(routes[path]).toHaveLength(path === '/healthz' ? 1 : 2);
    }
    // Guard rejects with default (disabled) config.
    const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();
    routes['/test/ping'][0]({ headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
