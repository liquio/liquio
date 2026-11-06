import customPassword from 'helpers/customPassword';
import { JsonSchemaNode } from '../types';

export default (
  pageDataOrigin: Record<string, unknown> = {},
  schema: JsonSchemaNode,
  documentData: Record<string, unknown> = {},
): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });
    const commandId = customPassword();

    const messageListener = (e: MessageEvent<{ commandId: string; error?: unknown; result?: unknown }>) => {
      if (e.data.commandId !== commandId) {
        return;
      }

      const { error, result } = e.data;
      worker.removeEventListener('message', messageListener, true);
      worker.terminate();

      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    };

    worker.addEventListener('message', messageListener as EventListener, false);
    worker.postMessage(
      JSON.parse(
        JSON.stringify({ commandId, pageDataOrigin, schema, documentData }),
      ),
    );
  });
