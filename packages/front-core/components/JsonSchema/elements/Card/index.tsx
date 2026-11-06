import React from 'react';

import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import CardPreview from 'components/JsonSchema/elements/Card/components/CardPreview';
import CardEditDialog from 'components/JsonSchema/elements/Card/components/CardEditDialog';
import { useTranslate } from 'react-translate';
import { JsonSchemaNode } from '../../types';

interface CardProps {
  rootDocument: { data: Record<string, unknown> };
  errors: Array<{ path: string }>;
  path: Array<string | number>;
  openEmpty?: boolean;
  value?: Record<string, unknown>;
  onChange: (event: unknown) => void;
  onCommit?: (value: Record<string, unknown>) => void;
  width?: string | number;
  sample?: string;
  noMargin?: boolean;
  required?: boolean;
  error?: unknown;
  schema: JsonSchemaNode;
  readOnly?: boolean;
  usedInTable?: boolean;
  actions: { setValues: (data: unknown) => unknown; validatePath: (path: unknown) => Promise<boolean> };
  [key: string]: unknown;
}

const Card = (props: CardProps) => {
  const containerRef = React.useRef<HTMLElement>(null);
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
      (props.onChange.bind(null, 'open') as (arg: unknown) => void)(true);
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
        setRecoverData={setRecoverData as (data: unknown) => void}
        rootDocument={props.rootDocument}
      />
      <CardEditDialog {...props} recoverData={recoverData} />
    </ElementContainer>
  );
};

export default Card;
