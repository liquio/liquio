import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormControl, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import FormHelperText from '@mui/material/FormHelperText';
import cx from 'classnames';

class TextFieldDummy extends Component {
  getValue() {
    const { value, select, children } = this.props;
    const selected =
      children &&
      React.Children.toArray(children)
        .filter((child) => child.props.value === value)
        .shift();
    switch (true) {
      case select:
        return selected && selected.props.children;
      default:
        return value;
    }
  }

  render() {
    const { classes, label, helperText, formControlProps, error } = this.props;

    const marginTop = cx({
      [classes.marginTop]: label
    });

    return (
      <FormControl variant="standard" {...formControlProps} margin="normal">
        {label ? (
          <FormHelperText
            className={cx(classes.dummyLabel, {
              [classes.error]: error
            })}
          >
            {label}
          </FormHelperText>
        ) : null}
        <Typography
          className={cx(classes.dummy, {
            [classes.error]: error
          })}
          classes={{ root: marginTop }}
          component="h2"
        >
          {this.getValue()}
        </Typography>
        {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
      </FormControl>
    );
  }
}

TextFieldDummy.propTypes = {
  value: PropTypes.node,
  select: PropTypes.bool,
  children: PropTypes.node,
  label: PropTypes.string,
  helperText: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  formControlProps: PropTypes.object,
  classes: PropTypes.object.isRequired
};

TextFieldDummy.defaultProps = {
  value: '',
  select: false,
  children: '',
  label: '',
  helperText: '',
  formControlProps: {}
};

export default withStyles({})(TextFieldDummy);
