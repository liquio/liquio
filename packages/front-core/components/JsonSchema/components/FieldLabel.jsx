import React from 'react';
import { useTranslate } from 'react-translate';
import { ReactReduxContext } from 'react-redux';

import renderHTML from 'helpers/renderHTML';
import evaluate from 'helpers/evaluate';
import RenderOneLine from 'helpers/renderOneLine';
import { resolveLocalizationText } from 'helpers/localization';

const FieldLabel = ({
  description,
  notRequiredLabel,
  required,
  rootDocument,
  value,
  steps,
  activeStep,
  renderOneLine = false,
  localizationTexts: localizationTextsProp = [],
}) => {
  const t = useTranslate('Elements');
  const reduxContext = React.useContext(ReactReduxContext);
  const localizationTexts =
    localizationTextsProp?.length
      ? localizationTextsProp
      : reduxContext?.store?.getState()?.app?.localizationTexts || [];

  const getDescription = () => {
    try {
      if (!rootDocument || !rootDocument.data) {
        return resolveLocalizationText(description, { localizationTexts, t });
      }
      const result = evaluate(
        description,
        value,
        rootDocument.data[steps[activeStep]],
        rootDocument.data
      );
      if (result instanceof Error) {
        return resolveLocalizationText(description, { localizationTexts, t });
      }
      return resolveLocalizationText(result, { localizationTexts, t });
    } catch (e) {
      return resolveLocalizationText(description, { localizationTexts, t });
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
