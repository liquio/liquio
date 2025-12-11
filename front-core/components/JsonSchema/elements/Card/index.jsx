import React from 'react';

import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import CardPreview from 'components/JsonSchema/elements/Card/components/CardPreview';
import CardEditDialog from 'components/JsonSchema/elements/Card/components/CardEditDialog';
import { useTranslate } from 'react-translate';

const Card = (props) => {
  const containerRef = React.useRef();
  const t = useTranslate('Elements');
  const [recoverData, setRecoverData] = React.useState(props.rootDocument.data);
  const hasError = React.useMemo(
    () =>
      props.errors.find(({ path }) => {
        const errorParentPath = path.split('.').slice(0, props.path.length);
        return errorParentPath.join('.') === props.path.join('.');
      }),
    [props.errors, props.path],
  );

  React.useEffect(() => {
    if (!props.openEmpty) {
      return;
    }

    if (Object.keys(props.value || {}).length === 0) {
      props.onChange.bind(null, 'open')(true);
    }
  });

  return (
    <ElementContainer
      containerRef={containerRef}
      bottomSample={true}
      width={props.width}
      sample={props.sample}
      noMargin={props.noMargin}
      required={props.required}
      error={props.error || (hasError && { message: t('CheckData') })}
    >
      <CardPreview
        containerRef={containerRef}
        onCommit={props.onCommit}
        hasError={hasError}
        value={props.value}
        schema={props.schema}
        onChange={props.onChange}
        readOnly={props.readOnly}
        usedInTable={props.usedInTable}
        setRecoverData={setRecoverData}
        rootDocument={props.rootDocument}
      />
      <CardEditDialog {...props} recoverData={recoverData} />
    </ElementContainer>
  );
};

export default Card;
