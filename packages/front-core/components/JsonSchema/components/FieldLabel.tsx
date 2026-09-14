import React from 'react';
import { useTranslate } from 'react-translate';
import { ReactReduxContext } from 'react-redux';

import renderHTML from 'helpers/renderHTML';
import evaluate from 'helpers/evaluate';
import RenderOneLine from 'helpers/renderOneLine';
import { resolveLocalizationText } from 'helpers/localization';

interface FieldLabelProps {
  description?: string;
  notRequiredLabel?: string;
  required?: boolean;
  rootDocument?: { data: Record<string, unknown> };
  value?: unknown;
  steps?: string[];
  activeStep?: number;
  renderOneLine?: boolean;
  localizationTexts?: unknown[];
}

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
}: FieldLabelProps) => {
  const t = useTranslate('Elements');
  const reduxContext = React.useContext(ReactReduxContext);
  const localizationTexts =
    localizationTextsProp?.length
      ? localizationTextsProp
      : (reduxContext?.store?.getState() as { app?: { localizationTexts?: unknown[] } })?.app?.localizationTexts || [];

  const getDescription = () => {
    try {
      if (!rootDocument || !rootDocument.data) {
        return resolveLocalizationText(description, { localizationTexts, t } as Parameters<typeof resolveLocalizationText>[1]);
      }
      const result = evaluate(
        description as string,
        value,
        rootDocument.data[steps?.[activeStep as number] as string],
        rootDocument.data
      );
      if (result instanceof Error) {
        return resolveLocalizationText(description, { localizationTexts, t } as Parameters<typeof resolveLocalizationText>[1]);
      }
      return resolveLocalizationText(result, { localizationTexts, t } as Parameters<typeof resolveLocalizationText>[1]);
    } catch {
      return resolveLocalizationText(description, { localizationTexts, t } as Parameters<typeof resolveLocalizationText>[1]);
    }
  };

  const combineDescription = () => {
    let text = ' (' + t('NotRequired') + ')';

    if (notRequiredLabel) text = ' (' + notRequiredLabel + ')';

    if (typeof notRequiredLabel === 'string' && !notRequiredLabel.length) text = '';

    return renderHTML((getDescription() as string) + (required ? '' : text));
  };

  const templated = combineDescription();

  return renderOneLine ? <RenderOneLine title={templated} allowMobile={true} /> : templated;
};

export default FieldLabel;
