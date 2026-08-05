import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import classNames from 'classnames';
import withStyles from '@mui/styles/withStyles';
import { Radio, Checkbox, FormGroup, FormControlLabel } from '@mui/material';
import ElementContainer from '../components/ElementContainer';

const styles = (theme) => ({
  iconSvgFillDark: {
    '& svg': {
      fill: theme?.palette?.primary?.main,
    },
  },
});

class BooleanElement extends React.Component {
  handleChange = (value) => () => {
    const { onChange } = this.props;
    onChange && onChange(value);
  };

  renderElement() {
    const {
      t,
      value,
      required,
      description,
      readOnly,
      path,
      classes,
      darkTheme,
      disabled,
    } = this.props;

    return required ? (
      <FormGroup row={true}>
        <FormControlLabel
          control={
            <Radio
              id={path.concat(true).join('-')}
              checked={value === true}
              onChange={this.handleChange(true)}
              disabled={disabled}
              aria-label={t('Yes')}
            />
          }
          label={t('Yes')}
        />
        <FormControlLabel
          control={
            <Radio
              id={path.concat(false).join('-')}
              checked={value === false}
              onChange={this.handleChange(false)}
              disabled={disabled}
              arial-label={t('No')}
            />
          }
          label={t('No')}
        />
      </FormGroup>
    ) : (
      <FormControlLabel
        control={
          <Checkbox
            id={path.join('-')}
            disabled={readOnly}
            checked={value}
            onChange={({ target: { checked } }) => this.handleChange(checked)()}
            classes={{
              checked: classNames({
                [classes.iconSvgFillDark]: darkTheme,
              }),
            }}
            aria-label={description}
          />
        }
        label={description}
      />
    );
  }

  render() {
    const { sample, description, required, error, hidden, noMargin } =
      this.props;

    if (hidden) return null;

    return (
      <ElementContainer
        sample={sample}
        description={required && description}
        required={required}
        error={error}
        noMargin={noMargin}
      >
        {this.renderElement()}
      </ElementContainer>
    );
  }
}

BooleanElement.propTypes = {
  path: PropTypes.array,
  darkTheme: PropTypes.bool,
};

BooleanElement.defaultProps = {
  path: [],
  darkTheme: false,
};
const styled = withStyles(styles)(BooleanElement);

export default translate('Elements')(styled);
