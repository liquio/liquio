import evaluate from 'helpers/evaluate';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const retryOperation = (operation, args, test, delay, retries) =>
  new Promise((resolve, reject) => {
    return operation(...args)
      .then((result) => {
        if (!evaluate(test, result)) {
          throw new Error('Виникла помилка при повторній обробці запиту');
        }
        return result;
      })
      .then(resolve)
      .catch((reason) => {
        if (retries > 0) {
          return wait(delay)
            .then(
              retryOperation.bind(
                null,
                operation,
                args,
                test,
                delay,
                retries - 1,
              ),
            )
            .then(resolve)
            .catch(reject);
        }
        return reject(reason);
      });
  });
