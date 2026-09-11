import React from 'react';
import diff from 'helpers/diff';
import evaluate from 'helpers/evaluate/asyncEvaluate';
import waiter from 'helpers/waitForAction';
import isEmpty from 'helpers/isEmpty';

const Calculator = ({
  value,
  path,
  onChange,
  rootDocument,
  calculate,
  disableIfEmptyValue = false,
  ignorePopupUseOwnData = false,
  documents,
}) => {
  React.useEffect(() => {
    const update = async () => {
      if (!calculate) {
        return;
      }

      waiter.addAction(
        path.concat('calculator'),
        async () => {
          try {
            const dataSource = ignorePopupUseOwnData
              ? documents?.rootDocument?.data
              : rootDocument.data;

            const calculated = await evaluate(calculate, dataSource);

            if (disableIfEmptyValue && isEmpty(calculated)) {
              return;
            }

            const diffs = diff(calculated, value);

            if (!diffs) {
              return;
            }

            console.log('calculated', calculate, calculated);
            onChange(calculated);
          } catch (e) {
            console.error('calculate', e, calculate);
          }
        },
        50,
      );
    };

    update();
  }, [
    rootDocument.data,
    calculate,
    disableIfEmptyValue,
    onChange,
    value,
    path,
    ignorePopupUseOwnData,
    documents,
  ]);

  return null;
};

export default Calculator;
