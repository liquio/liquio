import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import Select from 'components/Select';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import { requestAllUnits } from 'application/actions/units';
import processList from 'services/processList';

interface UnitOption {
  id: string;
  name?: string;
  [key: string]: unknown;
}

interface MenuOption extends UnitOption {
  value: string;
  label?: string;
}

const optionsToMenu = (option: UnitOption): MenuOption => ({
  ...option,
  value: option.id,
  label: option.name
});

interface UnitListProps {
  actions: { requestAllUnits: () => void };
  onChange: (value: string[]) => void;
  description?: string;
  sample?: string;
  required?: boolean;
  error?: unknown;
  path: string[];
  width?: number | string;
  value: string[];
  unitList?: UnitOption[];
  excludeUnit?: string;
  noMargin?: boolean;
  multiple?: boolean;
  darkTheme?: boolean;
  variant?: string;
  readOnly?: boolean;
}

const UnitList = ({
  actions,
  onChange,
  description = '',
  sample = '',
  required = false,
  error = null,
  path = [],
  width,
  value = [],
  unitList,
  excludeUnit,
  noMargin,
  multiple = true,
  darkTheme = false,
  variant,
  readOnly = false
}: UnitListProps) => {
  const [inputValue, setInputValue] = React.useState('');

  React.useEffect(() => {
    if (!unitList) {
      processList.hasOrSet('requestAllUnits', actions.requestAllUnits);
    }
  }, [actions, unitList]);

  const handleChange = (value: MenuOption | MenuOption[] | null) => {
    onChange(
      ((Array.isArray(value) ? value : [value]) || []).map((opt) => opt && opt.id).filter(Boolean) as string[]
    );
    setInputValue('');
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const values = value
    .map((unitId) => (unitList || []).find(({ id }) => unitId === id))
    .filter(Boolean)
    .map((option) => optionsToMenu(option as UnitOption));

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

const mapStateToProps = ({ units: { list } }: { units: { list: UnitOption[] } }) => ({ unitList: list });

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestAllUnits: bindActionCreators(requestAllUnits, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(UnitList as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
