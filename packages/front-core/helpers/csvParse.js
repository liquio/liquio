import { parse } from '@fast-csv/parse';

export default (scvContent, options = {}) =>
  new Promise((resolve, reject) => {
    const data = [];

    const stream = parse(options)
      .on('error', reject)
      .on('data', (row) => {
        data.push(row);
      })
      .on('end', () => resolve(data));

    stream.write(scvContent);
    stream.end();
  });
