import React, { Fragment } from 'react';
import classNames from 'classnames';
import renderHTML from 'helpers/renderHTML';
import { Checkbox, FormGroup, FormControlLabel } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import Property from 'components/JsonSchema/elements/CheckboxGroup/components/Property';
import { JsonSchemaNode } from '../../../types';

const styles = (theme: Theme) => ({
  labelSize: {
    position: 'relative' as const,
    marginBottom: 10,
    [theme.breakpoints.down('md')]: {
      marginLeft: -15,
    },
    '& span': {
      fontSize: 20,
      fontStyle: 'normal',
      fontWeight: 400,
      lineHeight: '24px',
      letterSpacing: '0.5px',
      [theme.breakpoints.down('md')]: {
        fontSize: 13,
        lineHeight: '18px',
      },
      ...((theme as unknown as { labelSize?: object }).labelSize || {}),
    },
  },
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
  distance: {
    marginTop: 10,
    maxWidth: 1000,
  },
  blockItem: {
    // paddingBottom: 20,
  },
  sampleComponent: {
    marginLeft: 30,
    fontWeight: 300,
    padding: '0 0 20px 0',
  },
  disabledItem: {
    marginLeft: 30,
    fontWeight: 300,
    padding: '0 0 20px 0',
  },
  checkboxRoot: {
    position: 'absolute' as const,
    top: -8,
    left: 0,
    [theme.breakpoints.down('md')]: {
      top: -11,
    },
  },
  checkbox: {
    width: 24,
    height: 24,
    [theme.breakpoints.down('md')]: {
      width: 20,
      height: 20,
      top: 2,
      position: 'relative' as const,
    },
  },
  topMargin: {
    marginTop: 10,
  },
  disabled: {
    opacity: 0.38,
    '&>span': {
      opacity: 0.38,
    },
  },
  secondaryLabel: {
    paddingLeft: 0,
    margin: 0,
    paddingBottom: 0,
    [theme.breakpoints.down('md')]: {
      paddingLeft: 25,
    },
    '& span': {
      fontSize: 16,
      left: -9,
      [theme.breakpoints.down('md')]: {
        fontSize: 13,
        top: -2,
        padding: 0,
        left: 0,
      },
    },
  },
  secondaryWrapp: {
    position: 'relative' as const,
    margin: 0,
    left: -3,
  },
  hidden: {
    display: 'none',
  },
});

interface CheckboxItem extends JsonSchemaNode {
  id: string | number;
  title?: unknown;
  sample?: unknown;
  properties?: Record<string, JsonSchemaNode>;
}

interface CheckedKeyItem {
  id?: unknown;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

interface CheckboxLayoutProps extends WithStyles<typeof styles> {
  isDisabled: (item: CheckboxItem) => boolean;
  handleChange: (id: unknown) => () => void;
  getSample: (key: CheckboxItem) => unknown;
  sample?: string | null;
  description?: string | null;
  required?: boolean | string[];
  readOnly?: boolean;
  items: CheckboxItem[];
  rowDirection: boolean;
  error?: unknown;
  path: Array<string | number>;
  width?: string | null;
  maxWidth?: string | null;
  propertyName?: string | null;
  checkedKeys: Array<string | number | CheckedKeyItem>;
  secondary?: boolean;
  position?: unknown;
  activePosition?: unknown;
  fontSize?: number | null;
  indexInfoHeight?: unknown;
  bottomSample?: boolean;
  errors?: Array<{ path: string }>;
  listenError?: string[];
  withIndex?: boolean;
  hiddenParent?: boolean;
  errorTextHeight?: unknown;
  addHeight: (params: Record<string, unknown>) => unknown;
  displayAllSamples?: boolean;
  isHidden: (item: CheckboxItem) => boolean;
  getTitle: (title: unknown) => unknown;
  value?: unknown;
  onChange?: unknown;
  notRequiredLabel?: string;
  typography?: string;
  hiddenKorpus?: boolean;
  [key: string]: unknown;
}

const CheckboxLayout = (props: CheckboxLayoutProps) => {
  const {
    sample,
    description,
    required,
    classes,
    readOnly,
    items,
    rowDirection,
    error,
    path,
    width,
    maxWidth,
    propertyName,
    checkedKeys,
    isDisabled,
    handleChange,
    getSample,
    getTitle,
    secondary,
    position,
    activePosition,
    errors = [],
    noMargin,
    listenError = ['.building', '.index'],
    indexInfoHeight,
    bottomSample,
    withIndex = true,
    errorTextHeight,
    hiddenParent = false,
    addHeight,
    fontSize,
    isHidden,
    value,
    onChange,
    notRequiredLabel,
    displayAllSamples = false,
    typography,
    hiddenKorpus,
  } = props;

  const positionFix = secondary
    ? addHeight({
        activePosition,
        indexInfoHeight,
        listenError,
        errors,
        withIndex,
        errorTextHeight,
        position,
        isChecked: (checkedKeys as unknown[]).length > 0,
        hiddenParent,
        isPopup: null,
        hiddenKorpus,
      })
    : null;

  const itemsWithProperties = items.some((item) => item.properties);

  const checkedKeyItems = checkedKeys as CheckedKeyItem[];
  const checkedKeyIds = checkedKeys as Array<string | number>;

  return (
    <ElementContainer
      sample={sample}
      description={description}
      variant={typography as never}
      required={
        Array.isArray(required) ? required.includes(propertyName as string) : required
      }
      error={error}
      width={width as never}
      maxWidth={maxWidth as never}
      className={secondary ? classes.secondaryWrapp : undefined}
      position={positionFix as never}
      noMargin={noMargin}
      bottomSample={bottomSample}
      notRequiredLabel={notRequiredLabel}
    >
      <FormGroup row={rowDirection}>
        {items.map((key) => (
          <>
            <Fragment key={key.id}>
              <FormControlLabel
                className={classNames({
                  [classes.labelSize]: true,
                  [classes.secondaryLabel]: !!secondary,
                  [classes.distance]: !rowDirection,
                  [classes[('fontSize' + fontSize) as 'fontSize14']]: !!fontSize,
                  [classes.blockItem]:
                    ((itemsWithProperties
                      ? !!checkedKeyItems?.find((item) => item?.id === key.id)
                      : !checkedKeyIds?.includes(key.id)) &&
                      !rowDirection) ||
                    ((itemsWithProperties
                      ? !!checkedKeyItems?.find((item) => item?.id === key.id)
                      : !checkedKeyIds?.includes(key.id)) &&
                      !rowDirection &&
                      !key.sample &&
                      !key.getSample),
                  [classes.hidden]: isHidden(key),
                })}
                key={key.id}
                disabled={isDisabled(key) || readOnly}
                control={
                  <Checkbox
                    id={path.concat(key.id).join('-')}
                    checked={
                      !!(itemsWithProperties
                        ? checkedKeyItems.find((item) => item?.id === key.id)
                        : checkedKeyIds.includes(key.id))
                    }
                    onChange={handleChange(key.id)}
                    disableRipple={secondary}
                    aria-label={key.title as string}
                  />
                }
                label={renderHTML(getTitle(key.title) as string)}
              />
              {((!rowDirection && itemsWithProperties
                ? checkedKeyItems.find((item) => item?.id === key.id)
                : checkedKeyIds.includes(key.id)) ||
                isDisabled(key) ||
                displayAllSamples) &&
              getSample(key) ? (
                <div
                  className={classNames({
                    [classes.sampleComponent]: true,
                    [classes.disabledItem]: isDisabled(key),
                  })}
                >
                  {renderHTML((getSample(key) as string) || '')}
                </div>
              ) : null}
            </Fragment>
            {key.properties ? (
              <Property
                keyProperty={key}
                checkedKeys={checkedKeyItems}
                properties={key.properties}
                value={value as CheckedKeyItem[] | undefined}
                path={path}
                readOnly={readOnly}
                onChange={onChange as (path: unknown, value: unknown) => void}
                props={props}
              />
            ) : null}
          </>
        ))}
      </FormGroup>
    </ElementContainer>
  );
};

const styled = withStyles(styles)(CheckboxLayout);
export default styled;
