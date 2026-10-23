import React from 'react';
import classNames from 'classnames';
import { Switch, FormControlLabel, Tooltip } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import { translate } from 'react-translate';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ElementContainer from '../components/ElementContainer';

const styles = (theme: Theme) => ({
  onText: {
    paddingLeft: 10,
  },
  offText: {
    marginLeft: 0,
  },
  blurText: {
    color: 'rgba(0, 0, 0, 0.54)',
    fontSize: '0.9rem',
  },
  columns3: {
    display: 'inline-block',
    margin: 0,
    marginBottom: 15,
    width: '30%',
    '& > label > label': {
      paddingLeft: 0,
    },
    [theme.breakpoints.down('lg')]: {
      display: 'block',
    },
  },
  columns6: {
    display: 'inline-block',
    margin: '0!important',
    marginTop: '20px!important',
    width: '40%',
    '& > label > label': {
      paddingLeft: 0,
    },
    [theme.breakpoints.down('lg')]: {
      display: 'block',
    },
  },
  darkTheme: {
    color: '#fff',
  },
  fullWidth: {
    width: 'calc(100% + 12px)',
    justifyContent: 'space-between',
    margin: 0,
    padding: 0,
  },
  switchRoot: {
    width: 43,
    height: 43,
  },
  switchBase: {
    transform: 'none!important',
    '&:hover': {
      backgroundColor: 'rgb(46 46 46)!important',
    },
  },
  nolabel: {
    padding: 0,
    margin: 0,
  },
  switchTrack: {
    display: 'none',
  },
  iconSvgFill: {
    fill: 'rgba(255, 255, 255, 0.7)',
  },
});

interface ToggleComponentProps extends WithStyles<typeof styles> {
  t: (key: string) => string;
  onChange?: ((value: boolean) => void) | null;
  value?: boolean | null;
  path?: Array<string | number>;
  defaultValue?: boolean;
  darkTheme?: boolean;
  labelPlacement?: 'start' | 'end' | 'top' | 'bottom';
  fullWidth?: boolean;
  reverseValue?: boolean;
  eyeIcon?: boolean;
  sample?: string;
  description?: string;
  noMargin?: boolean;
  required?: boolean;
  error?: unknown;
  offText?: React.ReactNode;
  onText?: React.ReactNode;
  readOnly?: boolean;
  hidden?: boolean;
  columns?: number;
  width?: number | string;
}

class ToggleComponent extends React.Component<ToggleComponentProps> {
  static defaultProps = {
    onChange: () => null,
    value: null,
    path: [],
    defaultValue: false,
    darkTheme: false,
    labelPlacement: 'start',
    fullWidth: false,
    reverseValue: false,
    eyeIcon: false,
  };

  componentDidMount() {
    this.checkValue();
  }

  componentDidUpdate(prevProps: ToggleComponentProps) {
    const { value } = this.props;
    if (prevProps.value !== value) {
      this.checkValue();
    }
  }

  checkValue = () => {
    const { value, onChange, defaultValue, hidden } = this.props;
    if (typeof value !== 'boolean' && !hidden) {
      onChange && onChange(defaultValue as boolean);
    }
  };

  handleChange = ({ target: { checked } }: React.ChangeEvent<HTMLInputElement>) => {
    const { onChange, reverseValue } = this.props;
    onChange && onChange(reverseValue ? !checked : checked);
  };

  render = () => {
    const {
      t,
      classes,
      value,
      sample,
      description,
      noMargin,
      required,
      error,
      offText,
      onText,
      readOnly,
      path = [],
      hidden,
      columns,
      darkTheme,
      labelPlacement,
      fullWidth,
      reverseValue,
      eyeIcon,
      width,
    } = this.props;

    if (hidden) return null;

    const checkedValue = reverseValue ? !(value || false) : value || false;

    const renderContent = (
      <FormControlLabel
        className={classes.offText}
        classes={{
          root: classNames({
            [classes.fullWidth]: !!fullWidth,
          }),
          label: classNames({
            [classes.darkTheme]: !!darkTheme,
          }),
        }}
        control={
          <FormControlLabel
            className={classes.onText}
            disabled={readOnly}
            classes={{
              root: classNames({
                [classes.fullWidth]: !!fullWidth,
                [classes.nolabel]: !!eyeIcon,
              }),
              label: classNames({
                [classes.darkTheme]: !!darkTheme,
              }),
            }}
            control={
              <Switch
                id={path.join('-')}
                checked={checkedValue}
                onChange={this.handleChange}
                color="primary"
                inputProps={{
                  'aria-label': t('ToggleSwitchTitle'),
                }}
                classes={{
                  switchBase: classNames({
                    [classes.switchBase]: !!eyeIcon,
                  }),
                  root: classNames({
                    [classes.switchRoot]: !!eyeIcon,
                  }),
                  track: classNames({
                    [classes.switchTrack]: !!eyeIcon,
                  }),
                }}
                {...(eyeIcon
                  ? {
                      checkedIcon: (
                        <VisibilityOffOutlinedIcon
                          className={classes.iconSvgFill}
                        />
                      ),
                      icon: (
                        <VisibilityOutlinedIcon
                          className={classes.iconSvgFill}
                        />
                      ),
                    }
                  : {})}
              />
            }
            label={eyeIcon ? '' : onText}
            labelPlacement={labelPlacement === 'start' ? 'end' : 'start'}
          />
        }
        label={eyeIcon ? '' : offText}
        labelPlacement={labelPlacement}
      />
    );

    const tooltipTitle = checkedValue ? onText : offText;

    return (
      <ElementContainer
        sample={sample}
        description={description}
        required={required}
        error={error as never}
        noMargin={noMargin}
        width={width}
        className={classNames({
          [classes.columns3]: !!(columns && columns === 3),
          [classes.columns6]: !!(columns && columns === 6),
        })}
      >
        {eyeIcon ? (
          <Tooltip title={tooltipTitle}>{renderContent}</Tooltip>
        ) : (
          <>{renderContent}</>
        )}
      </ElementContainer>
    );
  };
}

const styled = withStyles(styles)(ToggleComponent as never);

export default translate('Elements')(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;
