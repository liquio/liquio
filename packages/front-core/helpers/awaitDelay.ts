const awaitDelay = (delay: number): Promise<void> => new Promise((fulfill) => setTimeout(fulfill, delay));

export default awaitDelay;
