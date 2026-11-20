const mockRun = jest.fn();
const mockGetHandler = jest.fn();

jest.mock('./handlers/index', () => ({
  getHandler: (...args: any[]) => mockGetHandler(...args),
}));

import { Cli } from './index';

describe('Cli', () => {
  const originalArgv = process.argv;
  let exitSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.argv = originalArgv;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should keep config and models', () => {
    const cli = new Cli({ a: 1 }, { b: 2 });

    expect(cli.config).toEqual({ a: 1 });
    expect(cli.models).toEqual({ b: 2 });
  });

  it('should do nothing when the command is unknown', async () => {
    process.argv = ['node', 'app.js', 'unknown'];
    mockGetHandler.mockReturnValue(undefined);

    await new Cli().init();

    expect(mockGetHandler).toHaveBeenCalledWith('unknown');
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should run the handler with the remaining args and exit', async () => {
    process.argv = ['node', 'app.js', 'separate', '2025-01-01', '2025-01-31'];
    mockGetHandler.mockReturnValue({ run: mockRun });

    await new Cli().init();

    expect(mockRun).toHaveBeenCalledWith('2025-01-01', '2025-01-31');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should log handler errors and still exit', async () => {
    process.argv = ['node', 'app.js', 'migrate'];
    const error = new Error('boom');
    mockGetHandler.mockReturnValue({ run: jest.fn().mockRejectedValue(error) });

    await new Cli().init();

    expect(errorSpy).toHaveBeenCalledWith(error);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
