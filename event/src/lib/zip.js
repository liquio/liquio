/**
 * Make zip file
 */
const archiver = require('archiver');
const { PassThrough } = require('node:stream');

/**
 * Make stream as Buffer
 * @param {Stream} stream
 * @returns Buffer
 */
function streamToBuffer(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * Create zip from objects
 * @param {Array(Object(name: string, data: string|Buffer))} dataToZip
 * @returns zip-arcive as Buffer
 */
async function zip(dataToZip) {
  const passThrough = new PassThrough();
  const archive = archiver('zip');

  archive.on('warning', console.log);
  archive.on('error', console.error);

  archive.pipe(passThrough);

  [].concat(dataToZip).map(({ name, data }) => archive.append(data, { name }));

  archive.finalize();

  return streamToBuffer(passThrough);
}

module.exports = {
  zip,
};
