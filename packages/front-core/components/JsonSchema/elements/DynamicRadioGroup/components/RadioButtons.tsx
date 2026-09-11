import React from 'react';
import classNames from 'classnames';
import { Radio, RadioGroup, FormControlLabel } from '@mui/material';

import withStyles, { WithStyles } from '@mui/styles/withStyles';
import styles from 'components/JsonSchema/elements/RadioGroup/components/layout';

interface RadioItem {
  id: string | number;
  isDisabled?: boolean;
  [key: string]: unknown;
}

interface RadioButtonsProps extends WithStyles<typeof styles> {
  value?: { id?: string | number } | null;
  rowDirection?: boolean;
  path?: Array<string | number>;
  getLabel: (key: RadioItem) => React.ReactNode;
  onChange: (key: RadioItem) => () => void;
  readOnly?: boolean;
  list: RadioItem[];
  getSample?: (key: RadioItem) => React.ReactNode;
  fontSize?: string | number;
}

const RadioButtons = ({
  value = null,
  rowDirection = false,
  path = [],
  getLabel,
  onChange,
  readOnly = false,
  list,
  getSample = () => null,
  classes,
  fontSize,
}: RadioButtonsProps) => (
  <RadioGroup row={rowDirection}>
    {(list || []).map((key, index) => {
      if (!key.id) return null;

      return (
        <React.Fragment key={index}>
          <FormControlLabel
            label={getLabel(key)}
            // `classes.disabled`/`classes['fontSize' + fontSize]` reference class
            // names never defined in `layout.js`'s styles — always no-ops. Preserved as-is.
            className={classNames({
              [(classes as Record<string, string>)['fontSize' + fontSize]]: !!fontSize,
              [(classes as Record<string, string>).disabled]: !!key.isDisabled,
            })}
            disabled={key.isDisabled}
            control={
              <Radio
                id={path.concat(index).join('-')}
                checked={value?.id === key.id}
                onChange={onChange(key)}
                disabled={readOnly}
                aria-label={getLabel(key) as string}
                className={classNames({
                  [(classes as Record<string, string>).disabled]: !!key.isDisabled,
                })}
              />
            }
          />
          {getSample(key)}
        </React.Fragment>
      );
    })}
  </RadioGroup>
);

const styled = withStyles(styles)(RadioButtons);
export default styled;
