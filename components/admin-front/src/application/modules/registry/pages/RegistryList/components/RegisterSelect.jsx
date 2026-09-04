import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import Select from 'components/Select';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';

import { getAllRegisters } from 'application/actions/registry';

import processList from 'services/processList';
import { bindActionCreators } from 'redux';

const optionsToMenu = (option) =>
  option ? { ...option, value: option.id, label: option.name } : null;

class RegisterSelect extends React.Component {
  state = { options: [] };

  componentDidMount() {
    this.init();
  }

  init = async () => {
    const { actions } = this.props;

    const options = await processList.hasOrSet(
      'getAllRegisters',
      actions.getAllRegisters,
    );
    this.setState({ options });
  };

  handleChange = (value) => {
    const { onChange } = this.props;
    onChange(value && value.id);
  };

  render() {
    const { options } = this.state;
    const {
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

RegisterSelect.propTypes = {
  actions: PropTypes.object.isRequired,
  description: PropTypes.string,
  sample: PropTypes.string,
  value: PropTypes.object,
  error: PropTypes.object,
  required: PropTypes.bool,
  onChange: PropTypes.func,
  path: PropTypes.array,
};

RegisterSelect.defaultProps = {
  description: '',
  sample: '',
  value: [],
  error: null,
  required: false,
  onChange: () => null,
  path: [],
};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    getAllRegisters: bindActionCreators(getAllRegisters, dispatch),
  },
});

export default connect(null, mapDispatchToProps)(RegisterSelect);
