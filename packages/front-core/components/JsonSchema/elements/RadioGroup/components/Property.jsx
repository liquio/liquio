import React from 'react';
import PropTypes from 'prop-types';
import { SchemaForm } from 'components/JsonSchema';

const Property = ({ properties, value, path, readOnly, onChange, props }) => {
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
            path={path.concat('properties').concat(item)}
            readOnly={readOnly || properties[item].readOnly}
            value={value ? value?.properties && value?.properties[item] : null}
            onChange={onChange.bind(null, 'properties', item)}
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
  properties: PropTypes.object,
  value: PropTypes.object,
  path: PropTypes.array,
  readOnly: PropTypes.bool,
  onChange: PropTypes.func,
};

Property.defaultProps = {
  properties: {},
  value: {},
  path: [],
  readOnly: false,
  onChange: () => {},
};

export default Property;
