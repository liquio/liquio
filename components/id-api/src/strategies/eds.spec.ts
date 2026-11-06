import { eds } from './eds';

jest.mock('../services', () => ({ Services: { service: jest.fn(() => ({})) } }));
jest.mock('@liquio/back-core', () => ({
  Log: { getInstance: () => ({ save: jest.fn() }) },
}));

function makeApp(edsConfig?: Record<string, any>) {
  return {
    config: { auth_providers: edsConfig ? { eds: edsConfig } : {} },
    passport: { use: jest.fn(), authenticate: jest.fn(() => 'auth-mw'), mapping: {}, normalization: {}, valid: {} },
    post: jest.fn(),
    get: jest.fn(),
  } as any;
}

describe('eds strategy registration', () => {
  it('does not register the strategy or routes when eds is absent', async () => {
    const app = makeApp();
    await eds(app);
    expect(app.passport.use).not.toHaveBeenCalled();
    expect(app.post).not.toHaveBeenCalled();
  });

  it('does not register the strategy or routes when eds is disabled', async () => {
    const app = makeApp({ isEnabled: false });
    await eds(app);
    expect(app.passport.use).not.toHaveBeenCalled();
    expect(app.post).not.toHaveBeenCalled();
  });

  it('registers the strategy when eds is enabled', async () => {
    const app = makeApp({ isEnabled: true });
    await eds(app);
    expect(app.passport.use).toHaveBeenCalledTimes(1);
    expect(app.post).toHaveBeenCalledWith('/authorise/eds', 'auth-mw', expect.any(Function));
  });
});
