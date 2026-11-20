import debug from 'debug';

// Keep application log output off the terminal during e2e runs; show it with DEBUG=test:*.
// Structured JSON entries from ConsoleLogger go to test:log, any other console.* call to test:console.
// Tests that spy on console.* (captureLogs) still receive the calls.
const logDebug = debug('test:log');
const consoleDebug = debug('test:console');

for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
  console[method] = (...args: unknown[]) => {
    const [first] = args;
    if (args.length === 1 && typeof first === 'string' && first.startsWith('{"type"')) {
      logDebug('%s', first);
    } else {
      consoleDebug('%s', args.map(String).join(' '));
    }
  };
}
