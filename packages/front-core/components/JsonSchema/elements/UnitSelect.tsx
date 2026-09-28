import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';

import withStyles, { WithStyles } from '@mui/styles/withStyles';

import Select from 'components/Select';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';

const styles = {};

interface Unit {
  id: string | number;
  name?: string;
}

interface UnitSelectProps extends WithStyles<typeof styles> {
  units?: Unit[];
  onChange?: (value: unknown) => void;
  error?: unknown;
  path: Array<string | number>;
  value?: unknown;
  multiply?: boolean;
  autoFocus?: boolean;
  description?: string;
  sample?: string;
  required?: boolean;
  hidden?: boolean;
  noMargin?: boolean;
  typography?: string;
}

class UnitSelect extends React.Component<UnitSelectProps> {
  static defaultProps = {};

  getOptions = () => {
    const { units } = this.props;
    return (units || []).map(({ id, name }) => ({ value: id, label: name }));
  };

  handleChange = (value: unknown) => {
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
        variant={typography as never}
        required={required}
        error={error as never}
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

const mapStateToProps = ({ auth: { units } }: { auth: { units: Unit[] } }) => ({ units });

const styled = withStyles(styles)(UnitSelect);
const translated = translate('UnitSelect')(styled as never);
export default connect(mapStateToProps)(translated);
