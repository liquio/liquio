import momentJS from 'moment';

import EvaluateError from './EvaluateError';
import evaluateHelpers from './helpers';

type GlobalFunctions = Record<string, unknown>;

export const $: { workflow: GlobalFunctions } = {
  workflow: {}
};

export const setGlobalFunctions = (functions: unknown): void => {
  if (!functions || typeof functions !== 'object') return;

  $.workflow = Object.entries(functions as Record<string, string>).reduce<GlobalFunctions>((acc, [name, fnStr]) => {
    try {
      // eslint-disable-next-line no-eval
      acc[name] = eval(`(${fnStr})`);
    } catch (e) {
      console.error(`Invalid global function "${name}":`, e);
    }
    return acc;
  }, {});
};

export default (func: string, ...params: unknown[]): unknown => {
  if (!func) {
    return new EvaluateError('No function provided', func, params);
  }
  try {
    const moment = momentJS;
    const helpers = evaluateHelpers;
    // eslint-disable-next-line no-new-func
    const finalResult = new Function(
      'moment',
      'helpers',
      '$',
      '...args',
      `var __val__ = ${func};
   return (typeof __val__ === "function") ? __val__.apply(null, args) : __val__;`
    )(moment, helpers, $, ...params);
    return finalResult;
  } catch (e) {
    return new EvaluateError((e as Error).message, func, params);
  }
};
