import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox, FormGroup, FormControlLabel } from '@mui/material';
import classNames from 'classnames';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import withStyles from '@mui/styles/withStyles';

const styles = () => ({
  fontSize14: { '& span': { fontSize: 14 } },
  fontSize15: { '& span': { fontSize: 15 } },
  fontSize16: { '& span': { fontSize: 16 } },
  fontSize18: { '& span': { fontSize: 18 } },
  fontSize19: { '& span': { fontSize: 19 } },
  fontSize20: { '& span': { fontSize: 20 } },
  fontSize21: { '& span': { fontSize: 21 } },
  fontSize22: { '& span': { fontSize: 22 } },
  fontSize23: { '& span': { fontSize: 23 } },
  fontSize24: { '& span': { fontSize: 24 } },
  fontSize25: { '& span': { fontSize: 25 } },
  groupDescription: {
    margin: 0,
    fontWeight: 400,
    fontSize: 20,
    lineHeight: '24px',
    letterSpacing: '-0.02em',
    marginBottom: '0.35em',
  },
});

const CheckboxLayout = ({
  getSample,
  description,
  required,
  readOnly,
  rowDirection,
  error,
  path,
  list,
  checkedKeys,
  onChange,
  getLabel,
  noMargin,
  classes,
  fontSize,
  typography,
}) => (
  <ElementContainer
    description={description}
    variant={typography}
    required={required}
    error={error}
    noMargin={noMargin}
    descriptionClassName={classes.groupDescription}
  >
    <FormGroup row={rowDirection}>
      {list &&
        list.map((key, index) => {
          if (!key.id) return null;
          return (
            <>
              <FormControlLabel
                key={index}
                className={classNames({
                  [classes['fontSize' + fontSize]]: fontSize,
                })}
                control={
                  <Checkbox
                    id={path.concat(index).join('-')}
                    disabled={readOnly}
                    checked={!!checkedKeys.find(({ id }) => id === key.id)}
                    onChange={() => onChange(checkedKeys, key, key.id)}
                    aria-label={getLabel(key)}
                  />
                }
                label={getLabel(key)}
              />
              {getSample(key)}
            </>
          );
        })}
    </FormGroup>
  </ElementContainer>
);

CheckboxLayout.propTypes = {
  rowDirection: PropTypes.bool,
  onChange: PropTypes.func,
  getLabel: PropTypes.func,
  getSample: PropTypes.func,
  error: PropTypes.object,
  description: PropTypes.string,
  required: PropTypes.array,
  list: PropTypes.array,
  checkedKeys: PropTypes.array,
  readOnly: PropTypes.array,
  path: PropTypes.array,
  fontSize: PropTypes.number,
};

CheckboxLayout.defaultProps = {
  rowDirection: false,
  onChange: null,
  getLabel: null,
  getSample: null,
  checkedKeys: [],
  list: [],
  error: null,
  description: null,
  required: false,
  readOnly: false,
  path: [],
  fontSize: 20,
};

const styled = withStyles(styles)(CheckboxLayout);
export default styled;
