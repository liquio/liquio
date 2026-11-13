const logSave = jest.fn();
jest.mock('../lib/context', () => ({ getLog: () => ({ save: logSave }) }));
const checkValidToken = jest.fn();
jest.mock('../lib/link_providers/filestorage/filestorage_handler/filestorage_connection', () =>
  jest.fn().mockImplementation(function (this: any) {
    this.checkValidToken = checkValidToken;
  }),
);

import TestController from './test';

describe('TestController.ping', () => {
  it('should not return the filestorage error text on a failed healthcheck', async () => {
    delete (TestController as any).singleton;
    const controller: any = new TestController({ link_providers: { filestorage: { serversList: [{}] } } });
    checkValidToken.mockResolvedValueOnce({ error: new Error('401 token abc-secret rejected by http://fs.internal') });
    const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn().mockReturnThis() };

    await controller.ping({ query: { healthcheck: 'true' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: { message: 'Wrong Filestorage provider params.' } });
    expect(logSave).toHaveBeenCalledWith('ping-filestorage-check-error', { error: expect.stringContaining('abc-secret') });
  });
});
