import React from 'react';
import { translate } from 'react-translate';

import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import ElementWrapper from 'components/JsonSchema/components/ElementWrapper';

const FormElement = (Element) => (props) => {
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

export default (element) => translate('Elements')(FormElement(element));
