import React from 'react';
import { SchemaForm } from 'components/JsonSchema';
import { JsonSchemaNode } from '../../../types';

interface CheckedKeyItem {
  id?: unknown;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

interface PropertyProps {
  keyProperty: CheckedKeyItem;
  checkedKeys: CheckedKeyItem[];
  properties: Record<string, JsonSchemaNode>;
  value?: CheckedKeyItem[] | null;
  path: Array<string | number>;
  readOnly?: boolean;
  onChange: (path: unknown, value: unknown) => void;
  props: Record<string, unknown>;
}

const Property = ({
  keyProperty,
  checkedKeys,
  properties,
  value,
  path,
  readOnly,
  onChange,
  props,
}: PropertyProps) => {
  return (
    <>
      {Object.keys(properties || {}).map((item) => {
        const pathElement =
          value?.findIndex((item) => item?.id === keyProperty?.id) === -1
            ? ([] as Array<string | number>).concat('properties').concat(item)
            : ([] as Array<string | number>).concat(
                (value?.findIndex((item) => item?.id === keyProperty?.id) as number) +
                  '.properties.' +
                  item,
              );
        const valueElement = checkedKeys.find(
          (item) => item?.id === keyProperty?.id,
        )?.properties?.[item];

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
            parentValue={checkedKeys.find(
              (item) => item?.id === keyProperty?.id,
            )}
            key={item}
            path={path.concat(pathElement)}
            readOnly={readOnly || (properties[item] as { readOnly?: boolean }).readOnly}
            value={value ? valueElement : null}
            onChange={onChange.bind(null, pathElement)}
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
