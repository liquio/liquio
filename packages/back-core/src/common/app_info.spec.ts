import fs from 'node:fs';

import { AppInfo } from './app_info';

jest.mock('node:fs');

describe('AppInfo', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reads name and version from the current package.json', () => {
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ name: 'test-app', version: '1.2.3' }));

    const appInfo = new AppInfo();

    expect(appInfo.name).toBe('test-app');
    expect(appInfo.version).toBe('1.2.3');
    expect(appInfo.all).toEqual({ name: 'test-app', version: '1.2.3' });
  });

  it('acts as a singleton regardless of subsequent construction', () => {
    const first = new AppInfo();
    const second = new AppInfo();

    expect(second).toBe(first);
  });
});
