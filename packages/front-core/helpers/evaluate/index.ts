import momentJS from 'moment';
import { transformSync } from '@babel/core';

import EvaluateError from './EvaluateError';
import evaluateHelpers from './helpers';

export default (func: string, ...params: unknown[]): unknown => {
  if (!func) {
    return new EvaluateError('No function provided', func, params);
  }
  try {
    const moment = momentJS;
    const helpers = evaluateHelpers;
    void moment;
    void helpers;
    const { code } = transformSync(func) || {};
    // eslint-disable-next-line no-eval
    return eval(code as string)(...params);
  } catch (e) {
    return new EvaluateError((e as Error).message, func, params);
  }
};
