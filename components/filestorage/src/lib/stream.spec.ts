import { PassThrough } from 'node:stream';

import { Stream, PayloadTooLargeError } from './stream';

const makeStream = (headers: Record<string, string> = {}) => Object.assign(new PassThrough(), { headers });

describe('Stream.readWithLimit', () => {
  it('should return the whole body when under the limit', async () => {
    const stream = makeStream();
    const promise = Stream.readWithLimit(stream, 10);
    stream.write('abc');
    stream.end('def');
    expect((await promise).toString()).toBe('abcdef');
  });

  it('should accept a body exactly at the limit', async () => {
    const stream = makeStream();
    const promise = Stream.readWithLimit(stream, 4);
    stream.end('abcd');
    expect((await promise).length).toBe(4);
  });

  it('should reject with 413 when the received bytes exceed the limit', async () => {
    const stream = makeStream();
    const promise = Stream.readWithLimit(stream, 4);
    stream.write('abc');
    stream.write('def');
    await expect(promise).rejects.toMatchObject({ status: 413 });
    await expect(promise).rejects.toBeInstanceOf(PayloadTooLargeError);
  });

  it('should reject early on an oversized Content-Length without reading', async () => {
    const stream = makeStream({ 'content-length': '100' });
    const onSpy = jest.spyOn(stream, 'on');
    await expect(Stream.readWithLimit(stream, 10)).rejects.toMatchObject({ status: 413 });
    expect(onSpy).not.toHaveBeenCalledWith('data', expect.anything());
  });

  it('should propagate stream errors', async () => {
    const stream = makeStream();
    const promise = Stream.readWithLimit(stream, 10);
    stream.destroy(new Error('boom'));
    await expect(promise).rejects.toThrow('boom');
  });
});
