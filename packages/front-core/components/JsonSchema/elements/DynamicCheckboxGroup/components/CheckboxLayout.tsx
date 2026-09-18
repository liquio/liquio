import React from 'react';
import { Checkbox, FormGroup, FormControlLabel } from '@mui/material';
import classNames from 'classnames';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import withStyles, { WithStyles } from '@mui/styles/withStyles';

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
  labelCheckbox: {
    padding: '5px 0',
    minWidth: 0,
    maxWidth: '100%',
    marginLeft: 0,
    marginRight: 0,
    '& .MuiCheckbox-root': {
      flexShrink: 0
    },
    '& .MuiFormControlLabel-label': {
      minWidth: 0,
      whiteSpace: 'normal',
      overflowWrap: 'anywhere'
    }
  }
});

interface CheckboxItem {
  id: string | number;
  [key: string]: unknown;
}

interface CheckboxLayoutProps extends WithStyles<typeof styles> {
  getSample: (key: CheckboxItem) => React.ReactNode;
  description?: string | null;
  required?: boolean;
  readOnly?: boolean;
  rowDirection?: boolean;
  error?: unknown;
  path?: Array<string | number>;
  list?: CheckboxItem[];
  checkedKeys?: CheckboxItem[];
  onChange: (checkedKeys: CheckboxItem[], key: CheckboxItem, keyId: string | number) => void;
  getLabel: (key: CheckboxItem) => React.ReactNode;
  noMargin?: boolean;
  fontSize?: number;
  typography?: string;
}

const CheckboxLayout = ({
  getSample,
  description,
  required,
  readOnly,
  rowDirection = false,
  error,
  path = [],
  list = [],
  checkedKeys = [],
  onChange,
  getLabel,
  noMargin,
  classes,
  fontSize,
  typography,
}: CheckboxLayoutProps) => (
  <ElementContainer
    description={description as string}
    variant={typography as never}
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
            <React.Fragment key={index}>
              <FormControlLabel
                className={classNames({
                  [(classes as Record<string, string>)['fontSize' + fontSize]]: !!fontSize,
                  [classes.labelCheckbox]: true,
                })}
                control={
                  <Checkbox
                    id={path.concat(index).join('-')}
                    disabled={readOnly}
                    checked={!!checkedKeys.find(({ id }) => id === key.id)}
                    onChange={() => onChange(checkedKeys, key, key.id)}
                    aria-label={getLabel(key) as string}
                  />
                }
                label={getLabel(key)}
              />
              {getSample(key)}
            </React.Fragment>
          );
        })}
    </FormGroup>
  </ElementContainer>
);

const styled = withStyles(styles)(CheckboxLayout);
export default styled;
