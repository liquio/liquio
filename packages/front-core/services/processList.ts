const processList = new Map<string, Promise<unknown>>();

const getProcessName = (key: string, params: unknown[]) =>
  [key, JSON.stringify(params)].join('-');

const checkIfProcessListHas = (key: string, ...params: unknown[]) =>
  processList.get(getProcessName(key, params));

const setProcess = (
  key: string,
  handler: (...args: unknown[]) => unknown,
  ...params: unknown[]
) => {
  const processName = getProcessName(key, params);

  const processFunc = async () => {
    const result = await handler(...params);
    processList.delete(processName);
    return result;
  };

  processList.set(processName, processFunc());

  return processList.get(processName);
};

const hasOrSetProcess = (
  key: string,
  handler: (...args: unknown[]) => unknown,
  ...params: unknown[]
) => checkIfProcessListHas(key, ...params) || setProcess(key, handler, ...params);

export default {
  has: checkIfProcessListHas,
  set: setProcess,
  hasOrSet: hasOrSetProcess,
};
