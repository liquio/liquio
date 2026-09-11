import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';

import withStyles from '@mui/styles/withStyles';

import Select from 'components/Select';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';

const styles = {};

class UnitSelect extends React.Component {
  getOptions = () => {
    const { units } = this.props;
    return (units || []).map(({ id, name }) => ({ value: id, label: name }));
  };

  handleChange = (value) => {
    const { onChange } = this.props;
    onChange && onChange(value);
  };

  render() {
    const {
      error,
      path,
      value,
      multiply,
      autoFocus,
      description,
      sample,
      required,
      hidden,
      noMargin,
      typography,
    } = this.props;

    if (hidden) return null;

    return (
      <ElementContainer
        sample={sample}
        description={description}
        variant={typography}
        required={required}
        error={error}
        noMargin={noMargin}
      >
        <Select
          multiple={multiply}
          autoFocus={autoFocus}
          value={value}
          id={path.join('-')}
          onChange={this.handleChange}
          options={this.getOptions()}
          aria-label={description}
        />
      </ElementContainer>
    );
  }
}

UnitSelect.propTypes = {};

UnitSelect.defaultProps = {};

const mapStateToProps = ({ auth: { units } }) => ({ units });

const styled = withStyles(styles)(UnitSelect);
const translated = translate('UnitSelect')(styled);
export default connect(mapStateToProps)(translated);
