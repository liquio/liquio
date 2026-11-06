import { RouterService } from './router';

jest.mock('../controllers/ping', () => ({
  PingController: class {
    ping() {}
    healthz() {}
  },
}));
jest.mock('../controllers/monitor', () => ({
  MonitorController: class {
    system() {}
  },
}));

describe('RouterService.initRoutes', () => {
  it('guards diagnostic routes and leaves /healthz open', () => {
    const routes: Record<string, any[]> = {};
    const app = { get: (path: string, ...handlers: any[]) => (routes[path] = handlers) };
    const router = new RouterService({ server: {} });
    router.initRoutes(app);

    expect(Object.keys(routes).sort()).toEqual(['/healthz', '/monitors/system', '/test/ping']);
    for (const path of Object.keys(routes)) {
      expect(routes[path]).toHaveLength(path === '/healthz' ? 1 : 2);
    }
    const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();
    routes['/test/ping'][0]({ headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
