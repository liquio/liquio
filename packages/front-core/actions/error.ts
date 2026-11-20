const ON_ERROR_ADD = 'ON_ERROR_ADD';
const ON_MESSAGE_ADD = 'ON_MESSAGE_ADD';
const ON_ERROR_CLOSE = 'ON_ERROR_CLOSE';

export const addError = (error: unknown) => ({
  type: ON_ERROR_ADD,
  payload: error
});

export const addMessage = (message: unknown) => ({
  type: ON_MESSAGE_ADD,
  payload: message
});

export const closeError = (errorIndex?: number) => ({
  type: ON_ERROR_CLOSE,
  payload: errorIndex
});

export const showServiceMessage = (error: unknown) => ({
  type: 'SHOW_SERVICE_MESSAGE',
  payload: error
});
