import { Readable } from 'stream';

import { Stream } from './stream';

describe('Stream.getFileContent', () => {
  const createStream = (content: string, headers: Record<string, string> = {}): any => {
    const stream: any = Readable.from([Buffer.from(content)]);
    stream.headers = headers;
    return stream;
  };

  it('should read the whole content without limit', async () => {
    expect(await Stream.getFileContent(createStream('some content'))).toBe('some content');
  });

  it('should read content that fits the limit', async () => {
    expect(await Stream.getFileContent(createStream('some content'), { limit: '1kb' })).toBe('some content');
  });

  it('should reject with 413 when the content exceeds the limit', async () => {
    await expect(Stream.getFileContent(createStream('x'.repeat(2048)), { limit: '1kb' })).rejects.toMatchObject({
      status: 413,
      type: 'entity.too.large',
    });
  });

  it('should reject with 413 when the declared content length exceeds the limit', async () => {
    await expect(Stream.getFileContent(createStream('x', { 'content-length': '2048' }), { limit: '1kb' })).rejects.toMatchObject({
      status: 413,
    });
  });
});
