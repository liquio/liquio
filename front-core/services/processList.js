const processList = new Map();

const getProcessName = (key, params) => [key, JSON.stringify(params)].join('-');

const checkIfProcessListHas = (key, ...params) =>
  processList.get(getProcessName(key, params));

const setProcess = (key, handler, ...params) => {
  const processName = getProcessName(key, params);

  const processFunc = async () => {
    const result = await handler(...params);
    processList.delete(processName);
    return result;
  };

  processList.set(processName, processFunc());

  return processList.get(processName);
};

const hasOrSetProcess = (key, handler, ...params) =>
  checkIfProcessListHas(key, ...params) || setProcess(key, handler, ...params);

export default {
  has: checkIfProcessListHas,
  set: setProcess,
  hasOrSet: hasOrSetProcess,
};
