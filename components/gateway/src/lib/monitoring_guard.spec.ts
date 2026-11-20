import { monitoringGuard } from './monitoring_guard';

describe('monitoringGuard', () => {
  const run = (config: any, headers: any = {}) => {
    const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();
    monitoringGuard(config)({ headers }, res, next);
    return { res, next };
  };
  const enabled = { server: { monitoring: { isEnabled: true, token: 'secret' } } };

  it('rejects when monitoring config is missing', () => {
    const { res, next } = run({}, { 'x-monitoring-token': 'secret' });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when disabled even with correct token', () => {
    const { res, next } = run({ server: { monitoring: { isEnabled: false, token: 'secret' } } }, { 'x-monitoring-token': 'secret' });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when enabled with empty token configured', () => {
    const { res, next } = run({ server: { monitoring: { isEnabled: true, token: '' } } }, { 'x-monitoring-token': '' });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects without header or with wrong token', () => {
    expect(run(enabled).res.status).toHaveBeenCalledWith(403);
    const { res, next } = run(enabled, { 'x-monitoring-token': 'wrong' });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows with enabled flag and correct token', () => {
    const { res, next } = run(enabled, { 'x-monitoring-token': 'secret' });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
