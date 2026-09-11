import React from 'react';
import PropTypes from 'prop-types';
import { SchemaForm } from 'components/JsonSchema';

const Property = ({
  keyProperty,
  checkedKeys,
  properties,
  value,
  path,
  readOnly,
  onChange,
  props,
}) => {
  return (
    <>
      {Object.keys(properties || {}).map((item) => {
        const pathElement =
          value?.findIndex((item) => item?.id === keyProperty?.id) === -1
            ? [].concat('properties').concat(item)
            : [].concat(
                value?.findIndex((item) => item?.id === keyProperty?.id) +
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
            readOnly={readOnly || properties[item].readOnly}
            value={value ? valueElement : null}
            onChange={onChange.bind(null, pathElement)}
            required={
              Array.isArray(properties[item].required)
                ? properties[item].required.includes(item)
                : properties[item].required || properties[item].checkRequired
            }
          />
        );
      })}
    </>
  );
};

Property.propTypes = {
  properties: PropTypes.object.isRequired,
  value: PropTypes.object.isRequired,
  path: PropTypes.array.isRequired,
  readOnly: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default Property;
