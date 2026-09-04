import React, { Fragment } from 'react';
import { FormControl, InputLabel, Input, IconButton, FormHelperText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Clear, Check } from '@mui/icons-material';
import PropTypes from 'prop-types';
import cx from 'classnames';

import setComponentsId from 'helpers/setComponentsId';
import customInputStyle from 'variables/styles/customInputStyle';

function CustomInput({ ...props }) {
  const {
    classes,
    formControlProps,
    labelText,
    id: propId,
    setId,
    labelProps,
    inputProps,
    error,
    success,
    onClear,
    helperText,
    showErrors
  } = props;

  const labelClasses = cx(
    error && classes.labelRootError,
    success && !error && classes.labelRootSuccess
  );

  /*   const inkbarClasses = cx({
         [classes.inkbarError]: error,
         [classes.inkbarSuccess]: success && !error,
         [classes.inkbar]: !success && !error
         });
    */

  const marginTop = cx({
    [classes.marginTop]: labelText === undefined
  });
  const id = propId ? setId(` ${propId}`) : setId('');
  return (
    <FormControl
      variant="standard"
      {...formControlProps}
      className={cx(formControlProps.className, classes.formControl)}
    >
      {labelText ? (
        <InputLabel
          className={classes.labelRoot + labelClasses}
          htmlFor={id}
          id={setId('label')}
          {...labelProps}
        >
          {labelText}
        </InputLabel>
      ) : null}
      <Input
        classes={{
          root: marginTop,
          disabled: classes.disabled,
          // inkbar: inkbarClasses,
          underline: classes.underline
        }}
        id={id}
        {...inputProps}
      />
      {helperText ? (
        <FormHelperText
          id={setId('helper-text')}
          className={cx(showErrors && error && classes.labelRootError)}
        >
          {helperText}
        </FormHelperText>
      ) : null}
      {error ? (
        <Fragment>
          <IconButton
            onClick={onClear}
            className={cx(classes.feedback, classes.labelRootError)}
            id={setId('clear-button')}
            size="large"
          >
            <Clear />
          </IconButton>
          {success ? <Check className={cx(classes.feedback, classes.labelRootSuccess)} /> : null}
        </Fragment>
      ) : null}
    </FormControl>
  );
}

CustomInput.propTypes = {
  classes: PropTypes.object.isRequired,
  labelText: PropTypes.node,
  labelProps: PropTypes.object,
  id: PropTypes.string,
  inputProps: PropTypes.object,
  formControlProps: PropTypes.object,
  error: PropTypes.bool,
  success: PropTypes.bool,
  setId: PropTypes.func,
  onClear: PropTypes.func,
  helperText: PropTypes.string,
  showErrors: PropTypes.bool
};

CustomInput.defaultProps = {
  onClear: () => null,
  setId: setComponentsId('custom-input'),
  labelText: '',
  labelProps: {},
  id: '',
  inputProps: {},
  formControlProps: {},
  error: false,
  success: false,
  helperText: '',
  showErrors: false
};

export default withStyles(customInputStyle)(CustomInput);
