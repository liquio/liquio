import momentJS from 'moment';
import { transformSync } from '@babel/core';

import EvaluateError from './EvaluateError';
import evaluateHelpers from './helpers';

export default (func, ...params) => {
  if (!func) {
    return new EvaluateError('No function provided', func, params);
  }
  try {
    const moment = momentJS;
    const helpers = evaluateHelpers;
    void moment;
    void helpers;
    const { code } = transformSync(func);
    return eval(code)(...params);
  } catch (e) {
    return new EvaluateError(e.message, func, params);
  }
};
