import { buildSandboxConfig } from './sandbox_config';

describe('buildSandboxConfig', () => {
  it('should default to isolated-vm without a warning', () => {
    const warn = jest.fn();

    expect(buildSandboxConfig(undefined, warn)).toEqual({ isolationLevel: 'isolated-vm' });
    expect(buildSandboxConfig({}, warn)).toEqual({ isolationLevel: 'isolated-vm' });
    expect(buildSandboxConfig({ isolationLevel: 'isolated-vm' }, warn)).toEqual({ isolationLevel: 'isolated-vm' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('should override the function level and log a warning', () => {
    const warn = jest.fn();

    expect(buildSandboxConfig({ isolationLevel: 'function' }, warn)).toEqual({ isolationLevel: 'isolated-vm' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('sandbox-unsafe-function-level');
  });

  it('should keep other config keys', () => {
    const warn = jest.fn();

    expect(buildSandboxConfig({ isolationLevel: 'function', memoryLimit: 64, timeout: 1000 }, warn)).toEqual({
      memoryLimit: 64,
      timeout: 1000,
      isolationLevel: 'isolated-vm',
    });
  });
});
