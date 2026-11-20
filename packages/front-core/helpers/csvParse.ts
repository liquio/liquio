import { parse, ParserOptionsArgs } from '@fast-csv/parse';

export default (scvContent: string, options: ParserOptionsArgs = {}): Promise<unknown[]> =>
  new Promise((resolve, reject) => {
    const data: unknown[] = [];

    const stream = parse(options)
      .on('error', reject)
      .on('data', (row) => {
        data.push(row);
      })
      .on('end', () => resolve(data));

    stream.write(scvContent);
    stream.end();
  });
