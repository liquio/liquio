/* eslint-disable no-eval */
export default function (func, params) {
  return eval(func)(params);
}
