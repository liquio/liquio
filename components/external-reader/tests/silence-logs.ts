import debug from 'debug';

// Keep application log output off the terminal during e2e runs; show it with DEBUG=test:*.
// The app logger writes straight to process.stdout/stderr, so that is the only seam.
// Tests that spy on process.stdout.write (LogCapture) still see the raw lines.
const logDebug = debug('test:log');
const consoleDebug = debug('test:console');

const patched = Symbol.for('liquio.e2e.silenceLogs');

for (const stream of [process.stdout, process.stderr] as Array<NodeJS.WriteStream & { [patched]?: boolean }>) {
  if (stream[patched]) continue;
  stream[patched] = true;
  const original = stream.write.bind(stream) as (...args: unknown[]) => boolean;
  stream.write = ((chunk: unknown, ...rest: unknown[]) => {
    const text = typeof chunk === 'string' ? chunk : Buffer.isBuffer(chunk) ? chunk.toString() : undefined;
    if (text !== undefined && text.trimStart().startsWith('{"type"')) {
      for (const line of text.split('\n')) if (line.trim()) logDebug('%s', line);
      const cb = rest.find((r) => typeof r === 'function') as (() => void) | undefined;
      cb?.();
      return true;
    }
    return original(chunk, ...rest);
  }) as typeof stream.write;
}

// Raw console.* calls (jest console) go to debug as well.
for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
  console[method] = (...args: unknown[]) => consoleDebug('%s', args.map(String).join(' '));
}
