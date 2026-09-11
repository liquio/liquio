import { ComponentType } from 'react';
import { translate } from 'react-translate';

import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import ElementWrapper from 'components/JsonSchema/components/ElementWrapper';

interface FormElementProps {
  sample?: unknown;
  error?: unknown;
  width?: unknown;
  maxWidth?: unknown;
  hidden?: boolean;
  noMargin?: boolean;
  wrapperClass?: string;
  [key: string]: unknown;
}

const FormElement = (Element: ComponentType<Record<string, unknown>>) => (props: FormElementProps) => {
  const { sample, error, width, maxWidth, hidden, noMargin, wrapperClass } = props;

  if (hidden) return <Element {...props} />;

  return (
    <ElementContainer
      error={error}
      sample={sample}
      bottomSample={true}
      width={width}
      maxWidth={maxWidth}
      noMargin={noMargin}
      {...props}
    >
      <ElementWrapper wrapperClass={wrapperClass}>
        <Element {...props} />
      </ElementWrapper>
    </ElementContainer>
  );
};

export default (element: ComponentType<Record<string, unknown>>) => translate('Elements')(FormElement(element));
