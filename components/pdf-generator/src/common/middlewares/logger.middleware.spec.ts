import { EventEmitter } from 'events';

import { log } from '@lib/log';
import { LoggerMiddleware } from './logger.middleware';

jest.mock('@lib/log', () => ({ log: { save: jest.fn() } }));

describe('LoggerMiddleware', () => {
  it('logs neither credentials nor query secrets', () => {
    const request = {
      method: 'POST',
      originalUrl: '/pdf?token=query-secret&x=1#frag',
      headers: {
        authorization: 'Basic header-secret',
        cookie: 'sid=cookie-secret',
        'x-api-key': 'api-secret',
        'user-agent': 'jest',
        'content-type': 'application/json',
        'content-length': '10',
      },
    };
    const response = Object.assign(new EventEmitter(), { statusCode: 200 });
    const next = jest.fn();

    new LoggerMiddleware().use(request as never, response as never, next);
    response.emit('close');

    expect(next).toHaveBeenCalled();
    const [type, data] = (log.save as jest.Mock).mock.calls[0];
    expect(type).toBe('http-request');
    expect(data).toEqual({
      url: '/pdf',
      method: 'POST',
      statusCode: 200,
      headers: { 'user-agent': 'jest', 'content-length': '10', 'content-type': 'application/json' },
    });
    const serialized = JSON.stringify((log.save as jest.Mock).mock.calls);
    for (const secret of ['query-secret', 'header-secret', 'cookie-secret', 'api-secret']) {
      expect(serialized).not.toContain(secret);
    }
  });
});
