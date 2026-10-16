const logSave = jest.fn();
jest.mock('../../../context', () => ({
  getLog: () => ({ save: logSave }),
}));

import OpenStackConnection from './open_stack_connection';

const base = { name: 'main', port: 5000, tenantName: 't', admin: {}, user: {} };

describe('OpenStackConnection server scheme', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should reject http server by default', () => {
    expect(() => new OpenStackConnection({ ...base, server: 'http://keystone' })).toThrow(/https/);
  });

  it('should reject invalid and non-http(s) server URLs', () => {
    expect(() => new OpenStackConnection({ ...base, server: 'keystone' })).toThrow(/Invalid/);
    expect(() => new OpenStackConnection({ ...base, server: 'ftp://keystone' })).toThrow(/https/);
  });

  it('should reject http when allowInsecure is not strictly true', () => {
    expect(() => new OpenStackConnection({ ...base, server: 'http://keystone', allowInsecure: 'true' })).toThrow(/https/);
  });

  it('should accept https server', () => {
    expect(() => new OpenStackConnection({ ...base, server: 'https://keystone' })).not.toThrow();
    expect(logSave).not.toHaveBeenCalled();
  });

  it('should accept http with allowInsecure and log a warning', () => {
    expect(() => new OpenStackConnection({ ...base, server: 'http://keystone', allowInsecure: true })).not.toThrow();
    expect(logSave).toHaveBeenCalledWith('openstack-server-insecure-http', expect.objectContaining({ name: 'main' }));
  });
});
