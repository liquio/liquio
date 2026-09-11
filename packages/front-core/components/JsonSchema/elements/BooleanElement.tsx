import React from 'react';
import { Checkbox, FormControlLabel, FormGroup, Radio } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import withStyles, { type WithStyles } from '@mui/styles/withStyles';
import classNames from 'classnames';
import { translate, type Translate } from 'react-translate';

import ElementContainer from '../components/ElementContainer';

const styles = (theme: Theme) => ({
  iconSvgFillDark: {
    '& svg': {
      fill: theme.palette.primary.main,
    },
  },
});

export interface BooleanElementProps extends WithStyles<typeof styles> {
  t: Translate;
  value?: boolean | null;
  required?: boolean;
  description?: string;
  readOnly?: boolean;
  path?: Array<string | number>;
  darkTheme?: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
  sample?: string;
  error?: unknown;
  hidden?: boolean;
  noMargin?: boolean;
}

export class BooleanElement extends React.Component<BooleanElementProps> {
  static defaultProps = {
    path: [],
    darkTheme: false,
  };

  handleChange = (value: boolean) => () => {
    this.props.onChange?.(value);
  };

  renderElement() {
    const {
      t,
      value,
      required,
      description,
      readOnly,
      path = [],
      classes,
      darkTheme,
      disabled,
    } = this.props;

    return required ? (
      <FormGroup row={true}>
        <FormControlLabel
          control={
            <Radio
              id={path.concat('true').join('-')}
              checked={value === true}
              onChange={this.handleChange(true)}
              disabled={disabled}
              inputProps={{ 'aria-label': t('Yes') }}
            />
          }
          label={t('Yes')}
        />
        <FormControlLabel
          control={
            <Radio
              id={path.concat('false').join('-')}
              checked={value === false}
              onChange={this.handleChange(false)}
              disabled={disabled}
              inputProps={{ 'aria-label': t('No') }}
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
            checked={value ?? false}
            onChange={({ target: { checked } }) => this.handleChange(checked)()}
            classes={{
              checked: classNames({
                [classes.iconSvgFillDark]: darkTheme,
              }),
            }}
            inputProps={{ 'aria-label': description }}
          />
        }
        label={description}
      />
    );
  }

  render() {
    const { sample, description, required, error, hidden, noMargin } = this.props;

    if (hidden) return null;

    return (
      <ElementContainer
        sample={sample}
        description={required ? description : undefined}
        required={required}
        error={error}
        noMargin={noMargin}
      >
        {this.renderElement()}
      </ElementContainer>
    );
  }
}

const styled = withStyles(styles)(BooleanElement);
export default translate('Elements')(styled);
