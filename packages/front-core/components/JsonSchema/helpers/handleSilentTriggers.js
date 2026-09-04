/* eslint-disable no-plusplus */
/* eslint-disable no-console */
import objectPath from 'object-path';
import evaluate from 'helpers/evaluate';
import sha256 from 'js-sha256';

export default async ({
  origin = {},
  triggers = [],
  stepData,
  userInfo,
  actions,
  activityLog,
}) => {
  for (let i = 0; i < triggers.length; i++) {
    const { calculate, target, useSha256 = false } = triggers[i];

    if (!calculate || !target) {
      continue;
    }

    const targets = [].concat(target);
    for (let t = 0; t < targets.length; t++) {
      const targetPath = targets[t];

      try {
        let result = await evaluate(
          calculate,
          {},
          stepData,
          JSON.parse(JSON.stringify(origin)),
          {},
          userInfo,
          actions,
          activityLog,
        );

        if (result instanceof Error) {
          throw result;
        }

        if (typeof result !== 'boolean' && typeof result !== 'number') {
          result = result || undefined;
        }

        const stringified = JSON.stringify(result);
        result = stringified && JSON.parse(stringified);

        if (useSha256) {
          result = sha256(result);
        }

        objectPath.set(origin, targetPath, result);

        console.log('handle silent trigger', targetPath, result);
      } catch (e) {
        if (origin && (!origin.errors || Array.isArray(origin.errors))) {
          origin.errors = []
            .concat(origin.errors, {
              type: 'silent trigger error',
              targetPath,
              calculate,
              message: e.message,
            })
            .filter(Boolean);
        }
        console.error('silent trigger error', e, { targetPath, calculate });
        // throw new Error('TriggerError');
      }
    }
  }

  // console.log('handle silent trigger result', origin);
  return origin;
};
