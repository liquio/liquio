import React from 'react';
import PropTypes from 'prop-types';

import Select from 'components/Select';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';

const optionsToMenu = (option) =>
  option ? { ...option, value: option.id, label: option.name } : null;

const KeySelect = ({
  description,
  sample,
  required,
  error,
  path,
  width,
  value,
  excludeKey,
  noMargin,
  darkTheme,
  variant,
  options,
  onChange,
}) => {
  const handleChange = (value) => {
    onChange(value && value.id);
  };

  const keys = options || [];
  const keyValue = optionsToMenu(keys.find(({ id }) => value === id));

  return (
    <ElementContainer
      sample={sample}
      required={required}
      error={error}
      bottomSample={true}
      width={width}
      noMargin={noMargin}
    >
      <Select
        description={description}
        value={keyValue}
        error={error}
        darkTheme={darkTheme}
        variant={variant}
        id={path.join('-')}
        multiple={false}
        onChange={handleChange}
        options={keys.filter(({ id }) => id !== excludeKey).map(optionsToMenu)}
      />
    </ElementContainer>
  );
};

KeySelect.propTypes = {
  description: PropTypes.string,
  sample: PropTypes.string,
  value: PropTypes.object,
  error: PropTypes.object,
  required: PropTypes.bool,
  onChange: PropTypes.func,
  path: PropTypes.array,
};

KeySelect.defaultProps = {
  description: '',
  sample: '',
  value: [],
  error: null,
  required: false,
  onChange: () => null,
  path: [],
};

export default KeySelect;
