import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import SelectRaw from 'components/Select';
import ElementContainerRaw from 'components/JsonSchema/components/ElementContainer';

import { getAllRegisters } from 'application/actions/registry';

import processList from 'services/processList';

const Select = SelectRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ElementContainer = ElementContainerRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface RegisterOption {
  id: string;
  name?: string;
  [key: string]: unknown;
}

interface OptionMenu {
  id: string;
  name?: string;
  value: string;
  label?: string;
  [key: string]: unknown;
}

const optionsToMenu = (option: RegisterOption | null | undefined): OptionMenu | null =>
  option ? { ...option, value: option.id, label: option.name } : null;

interface RegisterSelectProps {
  actions: { getAllRegisters: () => Promise<RegisterOption[]> };
  description?: string;
  sample?: string;
  value?: string;
  error?: unknown;
  required?: boolean;
  onChange?: (value: string | null | undefined) => void;
  path: string[];
  width?: number | string;
  excludeKey?: string;
  noMargin?: boolean;
  darkTheme?: boolean;
  variant?: string;
}

interface RegisterSelectState {
  options: RegisterOption[];
}

class RegisterSelect extends React.Component<RegisterSelectProps, RegisterSelectState> {
  state: RegisterSelectState = { options: [] };

  componentDidMount() {
    this.init();
  }

  init = async () => {
    const { actions } = this.props;

    const options = (await processList.hasOrSet(
      'getAllRegisters',
      actions.getAllRegisters,
    )) as RegisterOption[];
    this.setState({ options });
  };

  handleChange = (value: OptionMenu | null) => {
    const { onChange } = this.props;
    onChange?.(value && value.id);
  };

  render() {
    const { options } = this.state;
    const {
      description = '',
      sample = '',
      required = false,
      error = null,
      path = [],
      width,
      value,
      excludeKey,
      noMargin,
      darkTheme,
      variant,
    } = this.props;

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
          onChange={this.handleChange}
          options={keys
            .filter(({ id }) => id !== excludeKey)
            .map(optionsToMenu)}
        />
      </ElementContainer>
    );
  }
}

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    getAllRegisters: bindActionCreators(getAllRegisters, dispatch),
  },
});

export default connect(null, mapDispatchToProps)(RegisterSelect as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
