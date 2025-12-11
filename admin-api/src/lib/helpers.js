/**
 * Helpers.
 */
class Helpers {
  /**
   * Transform function to async.
   * @param {string} functionString Function string.
   * @param {string[]} allowedAsyncFunctions Allowed async functions.
   * @returns {string} Transformed function string.
   */
  static transformFunctionToAsync (functionString, allowedAsyncFunctions = []) {
    // Define params.
    const isFunctionStringContainsAsyncFunction = allowedAsyncFunctions.some(
      (v) => functionString.includes(v) && !functionString.includes(`await ${v}`)
    );

    // Return as is if async function not used.
    if (!isFunctionStringContainsAsyncFunction) {
      return functionString;
    }

    // Transform to async.
    let asyncFunctionString = functionString;
    if (!asyncFunctionString.startsWith('async')) {
      asyncFunctionString = `async ${asyncFunctionString}`;
    }
    for (const asyncFunctionInside of allowedAsyncFunctions) {
      asyncFunctionString = asyncFunctionString.replace(
        new RegExp(asyncFunctionInside, 'g'),
        `await ${asyncFunctionInside}`
      );
    }

    // Return transformed function.
    return asyncFunctionString;
  }
}

module.exports = Helpers;
