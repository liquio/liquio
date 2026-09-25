import { InternalServerErrorException } from '@nestjs/common';

/**
 * Executes a promise with a timeout and proper cleanup.
 * @param {Promise<T>} promise - Promise to execute.
 * @param {number} ms - Timeout in milliseconds.
 * @returns {Promise<T>} Result of the promise.
 */
export async function timeoutExecute<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  const result = await Promise.race([
    (async () => {
      await new Promise((resolve) => {
        timeout = setTimeout(resolve, ms);
      });
      throw new InternalServerErrorException(`Timeout reached: ${ms}`);
    })(),
    (async () => {
      try {
        return await promise;
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    })(),
  ]);

  clearTimeout(timeout);

  return result;
}
