/* eslint-disable no-restricted-globals */
/* eslint-disable no-unused-vars */
/* eslint-disable no-eval */
import momentJS from 'moment';
import evaluateHelpers from './helpers';
import { transformAsync } from '@babel/core';

interface WorkerCommand {
  commandId: string;
  func: string;
  params: unknown[];
}

interface WorkerScope {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: { data: WorkerCommand }) => void, useCapture?: boolean): void;
}

const workerSelf = self as unknown as WorkerScope;

const onMessage = async function ({ data: { commandId, func, params } }: { data: WorkerCommand }): Promise<void> {
  try {
    const moment = momentJS;
    const helpers = evaluateHelpers;
    void moment;
    void helpers;
    const { code } = (await transformAsync(func)) || {};
    const result = eval(code as string)(...params);

    workerSelf.postMessage({
      commandId,
      result: result && JSON.parse(JSON.stringify(result))
    });
  } catch (error) {
    workerSelf.postMessage({ commandId, error: (error as Error).message });
  }
};

workerSelf.addEventListener('message', onMessage, false);
