const awaitDelay = (delay) =>
  new Promise((fulfill) => setTimeout(fulfill, delay));

export default awaitDelay;
