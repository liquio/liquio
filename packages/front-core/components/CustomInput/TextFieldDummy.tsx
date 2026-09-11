import React, { Component } from 'react';
import { FormControl, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import FormHelperText from '@mui/material/FormHelperText';
import cx from 'classnames';

interface TextFieldDummyProps {
  classes: Record<string, string>;
  value?: React.ReactNode;
  select?: boolean;
  children?: React.ReactNode;
  label?: string;
  helperText?: string | boolean;
  formControlProps?: Record<string, unknown>;
  error?: boolean;
}

class TextFieldDummy extends Component<TextFieldDummyProps> {
  static defaultProps: Partial<TextFieldDummyProps> = {
    value: '',
    select: false,
    children: '',
    label: '',
    helperText: '',
    formControlProps: {}
  };

  getValue() {
    const { value, select, children } = this.props;
    const selected =
      children &&
      (React.Children.toArray(children) as React.ReactElement<{ value?: unknown; children?: React.ReactNode }>[])
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
      [classes.marginTop]: !!label
    });

    return (
      <FormControl variant="standard" {...formControlProps} margin="normal">
        {label ? (
          <FormHelperText
            className={cx(classes.dummyLabel, {
              [classes.error]: !!error
            })}
          >
            {label}
          </FormHelperText>
        ) : null}
        <Typography
          className={cx(classes.dummy, {
            [classes.error]: !!error
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

export default withStyles({})(TextFieldDummy as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
