import React, { Fragment } from 'react';
import { FormControl, InputLabel, Input, IconButton, FormHelperText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Clear, Check } from '@mui/icons-material';
import cx from 'classnames';

import setComponentsId from 'helpers/setComponentsId';
import customInputStyle from 'variables/styles/customInputStyle';

interface CustomInputProps {
  classes: Record<string, string>;
  formControlProps?: Record<string, unknown> & { className?: string };
  labelText?: React.ReactNode;
  id?: string;
  setId?: (elementName: string) => string;
  labelProps?: Record<string, unknown>;
  inputProps?: Record<string, unknown>;
  error?: boolean;
  success?: boolean;
  onClear?: () => void;
  helperText?: string;
  showErrors?: boolean;
}

function CustomInput({ ...props }: CustomInputProps) {
  const {
    classes,
    formControlProps = {},
    labelText = '',
    id: propId = '',
    setId = setComponentsId('custom-input'),
    labelProps = {},
    inputProps = {},
    error = false,
    success = false,
    onClear = () => null,
    helperText = '',
    showErrors = false
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

export default withStyles(customInputStyle as never)(
  CustomInput as never
) as unknown as React.ComponentType<Record<string, unknown>>;
