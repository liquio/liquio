import React, { Fragment } from 'react';
import { FormControl, InputLabel } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { DateTimePicker as DateTimePickerRaw } from '@mui/x-date-pickers/DateTimePicker';
import { Clear, Check } from '@mui/icons-material';
import cx from 'classnames';

import setComponentsId from 'helpers/setComponentsId';
import customInputStyle from 'variables/styles/customInputStyle';

const DateTimePicker = DateTimePickerRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface CustomDateTimePickerProps {
  classes: Record<string, string>;
  formControlProps?: Record<string, unknown>;
  labelText?: React.ReactNode;
  id?: string;
  setId?: (elementName: string) => string;
  labelProps?: Record<string, unknown>;
  inputProps?: Record<string, unknown>;
  error?: boolean;
  success?: boolean;
}

const CustomDateTimePicker = ({
  classes,
  formControlProps,
  labelText,
  id: propId,
  setId: propSetId,
  labelProps,
  inputProps,
  error,
  success
}: CustomDateTimePickerProps) => {
  const labelClasses = cx(
    success && !error && classes.labelRootSuccess,
    error && classes.labelRootError
  );

  const setId = propSetId || setComponentsId('date-time-picker');
  const id = propId ? setId(` ${propId}`) : setId('');
  return (
    <FormControl
      variant="standard"
      {...formControlProps}
      className={cx('CustomInput', classes.formControl)}
      id={setId('form')}
    >
      {labelText && (
        <InputLabel
          className={classes.labelRoot + labelClasses}
          htmlFor={id}
          id={setId('label')}
          {...labelProps}
        >
          {labelText}
        </InputLabel>
      )}
      <DateTimePicker id={id} {...inputProps} />
      {error && (
        <Fragment>
          <Clear className={cx(classes.feedback, classes.labelRootError)} />
          {success && <Check className={cx(classes.feedback, classes.labelRootSuccess)} />}
        </Fragment>
      )}
    </FormControl>
  );
};

export default withStyles(customInputStyle as never)(
  CustomDateTimePicker as never
) as unknown as React.ComponentType<Record<string, unknown>>;
