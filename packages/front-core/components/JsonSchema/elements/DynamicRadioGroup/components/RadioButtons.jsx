import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Radio, RadioGroup, FormControlLabel } from '@mui/material';

import withStyles from '@mui/styles/withStyles';
import styles from 'components/JsonSchema/elements/RadioGroup/components/layout';

const RadioButtons = ({
  value,
  rowDirection,
  path,
  getLabel,
  onChange,
  readOnly,
  list,
  getSample,
  classes,
  fontSize,
}) => (
  <RadioGroup row={rowDirection}>
    {(list || []).map((key, index) => {
      if (!key.id) return null;

      return (
        <>
          <FormControlLabel
            key={index}
            label={getLabel(key)}
            className={classNames({
              [classes['fontSize' + fontSize]]: fontSize,
              [classes.disabled]: key.isDisabled,
            })}
            disabled={key.isDisabled}
            control={
              <Radio
                id={path.concat(index).join('-')}
                checked={value.id === key.id}
                onChange={onChange(key)}
                disabled={readOnly}
                aria-label={getLabel(key)}
                className={classNames({
                  [classes.disabled]: key.isDisabled,
                })}
              />
            }
          />
          {getSample(key)}
        </>
      );
    })}
  </RadioGroup>
);

RadioButtons.propTypes = {
  onChange: PropTypes.func.isRequired,
  getLabel: PropTypes.func.isRequired,
  list: PropTypes.array.isRequired,
  value: PropTypes.object,
  path: PropTypes.array,
  rowDirection: PropTypes.bool,
  readOnly: PropTypes.bool,
  getSample: PropTypes.func,
};

RadioButtons.defaultProps = {
  value: null,
  path: [],
  rowDirection: false,
  readOnly: false,
  getSample: () => {},
};

const styled = withStyles(styles)(RadioButtons);
export default styled;
