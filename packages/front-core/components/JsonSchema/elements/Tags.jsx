import React from 'react';
import ChipInput from '@lifayt/material-ui-chip-input';
import classNames from 'classnames';
import { makeStyles } from '@mui/styles';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import FieldLabel from 'components/JsonSchema/components/FieldLabel';

const styles = (theme) => ({
  darkThemeElement: {
    flex: 1,
    display: 'inline-flex',
    flexWrap: 'wrap',
    minWidth: 70,
    marginTop: 0,
    paddingTop: 16,
    backgroundColor: theme?.buttonHoverBg,
    '& fieldset': {
      borderColor: 'transparent',
      '& legend': {
        maxWidth: 0.01,
      },
    },
  },
});

const useStyles = makeStyles(styles);

const TagsElement = ({
  value,
  width,
  error,
  sample,
  onChange,
  noMargin,
  required,
  description,
  notRequiredLabel,
  darkTheme,
  variant,
}) => {
  const classes = useStyles();

  return (
    <ElementContainer
      sample={sample}
      required={required}
      error={error}
      bottomSample={true}
      width={width}
      noMargin={noMargin}
    >
      <ChipInput
        defaultValue={value}
        error={!!error}
        onChange={onChange}
        variant={variant}
        InputProps={{
          classes: {
            root: classNames({
              [classes.darkThemeElement]: darkTheme,
            }),
          },
        }}
        label={
          description ? (
            <FieldLabel
              description={description}
              required={required}
              notRequiredLabel={notRequiredLabel}
            />
          ) : null
        }
      />
    </ElementContainer>
  );
};

export default TagsElement;
