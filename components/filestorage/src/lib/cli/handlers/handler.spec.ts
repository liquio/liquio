const mockBottomBar = { write: jest.fn(), updateBottomBar: jest.fn() };

jest.mock('../bottom_bar', () => ({ BottomBar: jest.fn(() => mockBottomBar) }));

import { CliHandler } from './handler';

describe('CliHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should write log messages through the bottom bar', () => {
    const handler = new CliHandler();

    handler.log.write('hello');

    expect(mockBottomBar.write).toHaveBeenCalledWith('hello');
  });

  it('should update the bottom bar', () => {
    const handler = new CliHandler();

    handler.log.updateBottomBar('Processing file 1 of 2...');

    expect(mockBottomBar.updateBottomBar).toHaveBeenCalledWith('Processing file 1 of 2...');
  });

  it('should throw from the base run', async () => {
    await expect(new CliHandler().run()).rejects.toThrow('Not implemented');
  });
});
