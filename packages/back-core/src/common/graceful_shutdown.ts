import { errorRef } from '../message-bus/log_context';
import { MessageBusLog } from '../message-bus/types';

export interface ShutdownStep {
  name: string;
  run: () => Promise<void> | void;
}

export interface GracefulShutdownOptions {
  getLog: () => MessageBusLog;
  /** Run in order. */
  steps: ShutdownStep[];
  /** Default 28000. */
  forceExitAfterMs?: number;
  /** Default 1. */
  exitCode?: number;
  /** Default ['SIGINT', 'SIGTERM']. */
  signals?: NodeJS.Signals[];
  /** Default process. */
  processLike?: Pick<NodeJS.EventEmitter, 'once' | 'removeListener'>;
  /** Default process.exit. */
  exit?: (code: number) => void;
}

let registered = false;

/**
 * Run the steps once on the first termination signal, then exit.
 * @param {object} options Options.
 * @returns {function} Unregister function.
 */
export function registerGracefulShutdown(options: GracefulShutdownOptions): () => void {
  if (registered) throw new Error('Graceful shutdown is already registered.');
  registered = true;

  const signals = options.signals ?? ['SIGINT', 'SIGTERM'];
  const target = options.processLike ?? process;
  const exit = options.exit ?? ((code: number): void => process.exit(code));
  const exitCode = options.exitCode ?? 1;
  const forceExitAfterMs = options.forceExitAfterMs ?? 28000;
  const log = (): MessageBusLog => options.getLog();
  let started = false;
  let exited = false;

  const exitOnce = (): void => {
    if (exited) return;
    exited = true;
    exit(exitCode);
  };

  const handler = async (signal: string): Promise<void> => {
    if (started) return;
    started = true;
    const startedAt = Date.now();
    log().save('app-stopping', { signal });
    const timer = setTimeout((): void => {
      log().save('app-stop-timeout', { forceExitAfterMs }, 'error');
      exitOnce();
    }, forceExitAfterMs);
    timer.unref();
    for (const step of options.steps) {
      try {
        await step.run();
      } catch (error) {
        log().save('app-stop-step-error', { step: step.name, error: errorRef(error) }, 'error');
      }
    }
    clearTimeout(timer);
    log().save('app-stopped', { durationMs: Date.now() - startedAt });
    exitOnce();
  };

  const listeners = signals.map((signal): [string, () => void] => [signal, (): void => void handler(signal)]);
  for (const [signal, listener] of listeners) target.once(signal, listener);

  return (): void => {
    for (const [signal, listener] of listeners) target.removeListener(signal, listener);
    registered = false;
  };
}
