import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import Select from 'components/Select';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import { requestAllUnits } from 'application/actions/units';
import processList from 'services/processList';

const optionsToMenu = (option) => ({
  ...option,
  value: option.id,
  label: option.name
});

const UnitList = ({
  actions,
  onChange,
  description,
  sample,
  required,
  error,
  path,
  width,
  value,
  unitList,
  excludeUnit,
  noMargin,
  multiple,
  darkTheme,
  variant,
  readOnly
}) => {
  const [inputValue, setInputValue] = React.useState('');

  React.useEffect(() => {
    if (!unitList) {
      processList.hasOrSet('requestAllUnits', actions.requestAllUnits);
    }
  }, [actions, unitList]);

  const handleChange = (value) => {
    onChange(
      (Array.isArray(value) ? value : [value] || []).map((opt) => opt && opt.id).filter(Boolean)
    );
    setInputValue('');
  };

  const handleInputChange = (value) => {
    setInputValue(value);
  };

  const values = value
    .map((unitId) => (unitList || []).find(({ id }) => unitId === id))
    .filter(Boolean)
    .map(optionsToMenu);

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
        darkTheme={darkTheme}
        inputValue={inputValue}
        value={multiple ? values : values[0]}
        description={description}
        error={error}
        id={path.join('-')}
        multiple={multiple}
        variant={variant}
        onChange={handleChange}
        onInputChange={handleInputChange}
        readOnly={readOnly}
        options={unitList && unitList.filter(({ id }) => id !== excludeUnit).map(optionsToMenu)}
      />
    </ElementContainer>
  );
};

UnitList.propTypes = {
  actions: PropTypes.object.isRequired,
  description: PropTypes.string,
  sample: PropTypes.string,
  value: PropTypes.object,
  error: PropTypes.object,
  required: PropTypes.bool,
  onChange: PropTypes.func,
  path: PropTypes.array,
  multiple: PropTypes.bool,
  darkTheme: PropTypes.bool,
  readOnly: PropTypes.bool
};

UnitList.defaultProps = {
  description: '',
  sample: '',
  value: [],
  error: null,
  required: false,
  onChange: () => null,
  path: [],
  multiple: true,
  darkTheme: false,
  readOnly: false
};

const mapStateToProps = ({ units: { list } }) => ({ unitList: list });

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestAllUnits: bindActionCreators(requestAllUnits, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(UnitList);
