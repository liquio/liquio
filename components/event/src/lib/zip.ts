/**
 * Make zip file
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require('archiver');
import { PassThrough } from 'node:stream';

/**
 * Make stream as Buffer
 * @param {Stream} stream
 * @returns Buffer
 */
function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * Create zip from objects
 * @param {Array(Object(name: string, data: string|Buffer))} dataToZip
 * @returns zip-arcive as Buffer
 */
export async function zip(dataToZip: any): Promise<Buffer> {
  const passThrough = new PassThrough();
  const archive = archiver('zip');

  archive.on('warning', console.log);
  archive.on('error', console.error);

  archive.pipe(passThrough);

  [].concat(dataToZip).map(({ name, data }: any) => archive.append(data, { name }));

  archive.finalize();

  return streamToBuffer(passThrough);
}
