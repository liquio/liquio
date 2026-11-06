import React from 'react';
import { SchemaForm } from 'components/JsonSchema';
import { JsonSchemaNode } from '../../../types';

interface PropertyProps {
  properties?: Record<string, JsonSchemaNode>;
  value?: { properties?: Record<string, unknown> } | null;
  path?: Array<string | number>;
  readOnly?: boolean;
  onChange?: (...args: unknown[]) => void;
  props: Record<string, unknown>;
}

const Property = ({ properties = {}, value = {}, path = [], readOnly = false, onChange = () => undefined, props }: PropertyProps) => {
  return (
    <>
      {Object.keys(properties || {}).map((item) => {
        return (
          <SchemaForm
            actions={props.actions}
            steps={props.steps}
            task={props.task}
            taskId={props.taskId}
            activeStep={props.activeStep}
            documents={props.documents}
            rootDocument={props.rootDocument}
            originDocument={props.originDocument}
            fileStorage={props.fileStorage}
            stepName={props.stepName}
            error={props.error}
            errors={props.errors}
            schema={properties[item]}
            parentValue={value}
            key={item}
            path={(path as Array<string | number>).concat('properties').concat(item)}
            readOnly={readOnly || properties[item].readOnly}
            value={value ? value?.properties && value?.properties[item] : null}
            onChange={(onChange as (...args: unknown[]) => void).bind(null, 'properties', item)}
            required={
              Array.isArray(properties[item].required)
                ? (properties[item].required as string[]).includes(item)
                : properties[item].required || properties[item].checkRequired
            }
          />
        );
      })}
    </>
  );
};

export default Property;
