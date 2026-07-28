import React from 'react';
import { useTranslate } from 'react-translate';

import renderHTML from 'helpers/renderHTML';
import evaluate from 'helpers/evaluate';
import RenderOneLine from 'helpers/renderOneLine';

const FieldLabel = ({
  description,
  notRequiredLabel,
  required,
  rootDocument,
  value,
  steps,
  activeStep,
  renderOneLine = false
}) => {
  const t = useTranslate('Elements');

  const getDescription = () => {
    try {
      if (!rootDocument || !rootDocument.data) return description;
      const result = evaluate(
        description,
        value,
        rootDocument.data[steps[activeStep]],
        rootDocument.data
      );
      if (result instanceof Error) return description;
      return result;
    } catch (e) {
      return description;
    }
  };

  const combineDescription = () => {
    let text = ' (' + t('NotRequired') + ')';

    if (notRequiredLabel) text = ' (' + notRequiredLabel + ')';

    if (typeof notRequiredLabel === 'string' && !notRequiredLabel.length) text = '';

    return renderHTML(getDescription() + (required ? '' : text));
  };

  const templated = combineDescription();

  return renderOneLine ? <RenderOneLine title={templated} allowMobile={true} /> : templated;
};

export default FieldLabel;
