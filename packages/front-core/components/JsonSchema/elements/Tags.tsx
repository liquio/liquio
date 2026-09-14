import React from 'react';
import ChipInput from '@lifayt/material-ui-chip-input';
import classNames from 'classnames';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import FieldLabel from 'components/JsonSchema/components/FieldLabel';

const styles = (theme: Theme) => ({
  darkThemeElement: {
    flex: 1,
    display: 'inline-flex',
    flexWrap: 'wrap' as const,
    minWidth: 70,
    marginTop: 0,
    paddingTop: 16,
    backgroundColor: (theme as unknown as { buttonHoverBg?: string })?.buttonHoverBg,
    '& fieldset': {
      borderColor: 'transparent',
      '& legend': {
        maxWidth: 0.01,
      },
    },
  },
});

const useStyles = makeStyles(styles);

interface TagsElementProps {
  value?: unknown[];
  width?: number | string;
  error?: unknown;
  sample?: string;
  onChange?: (chips: unknown[]) => unknown;
  noMargin?: boolean;
  required?: boolean;
  description?: string;
  notRequiredLabel?: string;
  darkTheme?: boolean;
  variant?: 'standard' | 'outlined' | 'filled';
}

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
}: TagsElementProps) => {
  const classes = useStyles();

  return (
    <ElementContainer
      sample={sample}
      required={required}
      error={error as never}
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
              [classes.darkThemeElement]: !!darkTheme,
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
