import LinkProvider from './link_provider';

describe('LinkProvider', () => {
  it('should store the given config', () => {
    const config = { foo: 'bar' };
    const provider = new LinkProvider(config);
    expect(provider.config).toBe(config);
  });

  it('should throw on isValidOptions when not overridden', () => {
    const provider = new LinkProvider({});
    expect(() => provider.isValidOptions()).toThrow('Provider method not defined.');
  });

  it('should reject on open when not overridden', async () => {
    const provider = new LinkProvider({});
    await expect(provider.open()).rejects.toThrow('Provider method not defined.');
  });

  it('should resolve to null on getFileStream by default', async () => {
    const provider = new LinkProvider({});
    await expect(provider.getFileStream()).resolves.toBeNull();
  });
});
