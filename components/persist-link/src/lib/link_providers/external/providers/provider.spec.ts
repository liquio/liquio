import Provider from './provider';

describe('Provider', () => {
  it('should store the given config', () => {
    const config = { foo: 'bar' };
    const provider = new Provider(config);
    expect(provider.config).toBe(config);
  });
});
