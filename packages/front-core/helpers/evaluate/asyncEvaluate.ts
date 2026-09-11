import customPassword from 'helpers/customPassword';

import EvaluateError from './EvaluateError';

export default (func: string, ...params: unknown[]): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module'
    });
    const commandId = customPassword();

    const messageListener = (e: MessageEvent<{ commandId: string; error?: string; result?: unknown }>) => {
      if (e.data.commandId !== commandId) {
        return;
      }

      const { error, result } = e.data;
      worker.removeEventListener('message', messageListener, true);
      worker.terminate();

      if (error) {
        reject(new EvaluateError(error, func, params));
      } else {
        resolve(result);
      }
    };

    worker.addEventListener('message', messageListener, false);
    worker.postMessage({
      commandId,
      func,
      params: params && JSON.parse(JSON.stringify(params))
    });
  });
