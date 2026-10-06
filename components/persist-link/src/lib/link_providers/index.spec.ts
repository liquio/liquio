jest.mock('./external');
jest.mock('./filestorage');
jest.mock('./open_stack');
jest.mock('./simple');

import ExternalLinkProvider from './external';
import FilestorageLinkProvider from './filestorage';
import LinkProviders from './index';
import OpenStackLinkProvider from './open_stack';
import SimpleLinkProvider from './simple';

describe('LinkProviders', () => {
  beforeEach(() => {
    (LinkProviders as any).singleton = undefined;
    jest.clearAllMocks();
  });

  it('should always create the simple provider', () => {
    const providersConfig = { simple: { foo: 'bar' } };
    const linkProviders = new LinkProviders(providersConfig);

    expect(SimpleLinkProvider).toHaveBeenCalledWith(providersConfig.simple);
    expect(linkProviders.list.simple).toBeInstanceOf(SimpleLinkProvider);
  });

  it('should not create the optional providers when config is not provided', () => {
    const linkProviders = new LinkProviders({ simple: {} });

    expect(OpenStackLinkProvider).not.toHaveBeenCalled();
    expect(FilestorageLinkProvider).not.toHaveBeenCalled();
    expect(ExternalLinkProvider).not.toHaveBeenCalled();
    expect(linkProviders.list.openStack).toBeFalsy();
    expect(linkProviders.list.filestorage).toBeFalsy();
    expect(linkProviders.list.external).toBeFalsy();
  });

  it('should create the optional providers when config is provided', () => {
    const providersConfig = {
      simple: {},
      openStack: { openStackOption: true },
      filestorage: { filestorageOption: true },
      external: { externalOption: true },
    };
    const linkProviders = new LinkProviders(providersConfig);

    expect(OpenStackLinkProvider).toHaveBeenCalledWith(providersConfig.openStack);
    expect(FilestorageLinkProvider).toHaveBeenCalledWith(providersConfig.filestorage);
    expect(ExternalLinkProvider).toHaveBeenCalledWith(providersConfig.external);
    expect(linkProviders.list.openStack).toBeInstanceOf(OpenStackLinkProvider);
    expect(linkProviders.list.filestorage).toBeInstanceOf(FilestorageLinkProvider);
    expect(linkProviders.list.external).toBeInstanceOf(ExternalLinkProvider);
  });

  it('should behave as a singleton and ignore subsequent config', () => {
    const first = new LinkProviders({ simple: {} });
    const second = new LinkProviders({ simple: {}, openStack: { foo: 'bar' } });

    expect(second).toBe(first);
    expect(OpenStackLinkProvider).not.toHaveBeenCalled();
  });
});
