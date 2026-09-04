/* eslint-disable no-restricted-globals */
/* eslint-disable no-unused-vars */
/* eslint-disable no-eval */
import momentJS from 'moment';
import evaluateHelpers from './helpers';
import { transformAsync } from '@babel/core';

const onMessage = async function ({ data: { commandId, func, params } }) {
  try {
    const moment = momentJS;
    const helpers = evaluateHelpers;
    const { code } = await transformAsync(func);
    const result = eval(code)(...params);

    self.postMessage({
      commandId,
      result: result && JSON.parse(JSON.stringify(result)),
    });
  } catch (error) {
    self.postMessage({ commandId, error: error.message });
  }
};

self.addEventListener('message', onMessage, false);
