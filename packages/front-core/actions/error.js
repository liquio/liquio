const ON_ERROR_ADD = 'ON_ERROR_ADD';
const ON_MESSAGE_ADD = 'ON_MESSAGE_ADD';
const ON_ERROR_CLOSE = 'ON_ERROR_CLOSE';

export const addError = (error) => ({
  type: ON_ERROR_ADD,
  payload: error
});

export const addMessage = (message) => ({
  type: ON_MESSAGE_ADD,
  payload: message
});

export const closeError = (errorIndex) => ({
  type: ON_ERROR_CLOSE,
  payload: errorIndex
});

export const showServiceMessage = (error) => ({
  type: 'SHOW_SERVICE_MESSAGE',
  payload: error
});
