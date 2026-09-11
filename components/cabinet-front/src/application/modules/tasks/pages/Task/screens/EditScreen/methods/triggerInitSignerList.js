import objectPath from 'object-path';
import findPathDeep from 'deepdash/findPathDeep';

import propsToData from 'modules/tasks/pages/Task/helpers/propsToData';
import evaluate from 'helpers/evaluate';
import checkSignersData from 'helpers/checkSignersData';

export default function triggerInitSignerList(props = {}) {
  const {
    origin,
    task,
    stepId,
    template: { jsonSchema }
  } = propsToData(this.props);
  const { navigating } = props;

  const signersListPath = findPathDeep(jsonSchema.properties, (value) => value === 'signer.list');

  if (!signersListPath || task.finished) return false;

  const controlPropsPath = signersListPath.replace('.control', '');
  const control = objectPath.get(jsonSchema.properties, controlPropsPath);

  if (!control?.shouldInit) return false;

  const shouldInit = evaluate(control.shouldInit, task.document.data);

  if (navigating && control.steps) {
    const activeStep = this.getActiveStep();
    const shouldCall = control.steps.includes(activeStep) || control.steps.includes(stepId);

    if (shouldCall) return controlPropsPath;

    return false;
  }

  if (shouldInit instanceof Error) throw shouldInit;
  if (!shouldInit || control.steps) return false;

  const { calcSigners } = control;

  if (!calcSigners) return false;

  const originArray = evaluate(calcSigners, origin.document);
  if (originArray instanceof Error) throw originArray;

  const rootArray = evaluate(calcSigners, task.document);
  if (rootArray instanceof Error) throw rootArray;

  if (JSON.stringify(originArray) === JSON.stringify(rootArray)) return false;

  if (!checkSignersData(rootArray)) return false;

  return controlPropsPath;
}
