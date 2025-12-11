import React from 'react';
import { useTranslate } from 'react-translate';
import { Typography } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import classNames from 'classnames';
import theme from 'theme';
import MobileDetect from 'mobile-detect';
import iconPlus from 'assets/img/iconPlus.svg';
import arrowUp from 'assets/img/arrowUp.svg';
import arrowDown from 'assets/img/arrowDown.svg';

const getFont = () => {
  try {
    return theme?.typography?.fontFamily;
  } catch {
    return 'Roboto';
  }
};

const styles = (theme) => ({
  countWrapper: {
    display: 'flex',
    alignItems: 'center',
    '&:not(:last-child)': {
      marginRight: '16px',
    },
  },
  countLabel: {
    fontSize: 13,
    lineHeight: '18px',
  },
  count: {
    color: '#fff',
    backgroundColor: '#000',
    paddingLeft: 4,
    paddingRight: 4,
    display: 'inline-block',
    borderRadius: 15,
    fontSize: 11,
    letterSpacing: '0.5px',
    marginLeft: 8,
    minWidth: 24,
    textAlign: 'center',
  },
  wrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    backgroundColor: '#fff !important',
    border: '2px solid #E7EEF3 !important',
    borderTop: 'none !important',
    padding: '16px !important',
  },
  btn: {
    fontSize: '13px',
    lineHeight: '16px',
    fontFamily: `${getFont()}`,
    border: '2px solid #000 !important',
    borderRadius: '40px !important',
    backgroundImage: `url(${iconPlus}) !important`,
    backgroundRepeat: 'no-repeat !important',
    padding: '10px 14px !important',
    backgroundPosition: '14px center !important',
    paddingLeft: '46px !important',
    marginRight: '16px',
    color: '#000',
    cursor: 'pointer',
    '&.dsg-add-row-btn:before, &.dsg-add-row-btn:after': {
      content: 'none',
    },
    [theme.breakpoints.down('sm')]: {
      marginRight: 24,
    },
  },
  rowsLabel: {
    margin: 0,
    fontSize: '13px',
    lineHeight: '16px',
    marginRight: '8px',
  },
  rowsWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  rowsSettings: {
    display: 'flex',
    '& .dsg-add-row-input': {
      width: '24px !important',
      fontFamily: `${getFont()}`,
      border: '2px solid #fff',
      borderBottom: '2px solid #000',
      padding: '4px 2px !important',
      textAlign: 'right',
      '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
        '-webkit-appearance': 'none',
        margin: 0,
      },
      '&[type=number]': {
        '-moz-appearance': 'textfield',
      },
      '&:hover': {
        border: '2px solid #fff',
        borderBottom: '2px solid #000',
      },
      [theme.breakpoints.down('sm')]: {
        width: '32px !important',
      },
    },
  },
  rowsBtns: {
    display: 'flex',
    flexDirection: 'column',
    marginLeft: '8px',
  },
  countInput: {
    display: 'flex',
    alignItems: 'center',
  },
  select: {
    width: '16px',
    height: '16px',
    border: 'none',
    backgroundSize: 'contain',
    backgroundColor: 'inherit',
  },
  arrowUp: {
    backgroundImage: `url(${arrowUp}) !important`,
  },
  arrowDown: {
    backgroundImage: `url(${arrowDown}) !important`,
  },
  rowsInfo: {
    display: 'flex',
  },
  errorCount: {
    backgroundColor: '#BA0009',
  },
  errorText: {
    color: '#BA0009',
  },
});

const useStyles = makeStyles(styles);

const CustomAddRowsComponent = ({ addRows, rows, errors }) => {
  const [value, setValue] = React.useState(1);
  const [rawValue, setRawValue] = React.useState(value);
  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });
  const t = useTranslate('Elements');
  const classes = useStyles();
  const addRowCount = () => {
    if (rawValue + 1 > 1000) {
      setRawValue(1000);
      setValue(1000);
    } else {
      setValue(rawValue + 1);
      setRawValue(rawValue + 1);
    }
  };
  const minusRowCount = () => {
    if (rawValue > 1) {
      setValue(rawValue - 1);
      setRawValue(rawValue - 1);
    }
  };
  return (
    <>
      <div className={classNames('dsg-add-row', classes.wrapper)}>
        <div className={classes.rowsSettings}>
          <button
            type="button"
            className={classNames('dsg-add-row-btn', classes.btn)}
            onClick={() => addRows(value)}
          >
            {t('Add')}
          </button>{' '}
          <div className={classes.rowsWrapper}>
            <p className={classes.rowsLabel}>{t('rows')}</p>
            <div className={classes.countInput}>
              <input
                className="dsg-add-row-input"
                value={rawValue}
                onBlur={() => setRawValue(value)}
                type="number"
                min={1}
                style={{ width: '70px' }}
                onInput={(e) => {
                  e.target.value = Math.max(1, parseInt(e.target.value) || 0);
                }}
                onChange={(e) => {
                  if (e.target.value > 1000) {
                    setValue(1000);
                    setRawValue('1000');
                    return;
                  }
                  setRawValue(e.target.value);
                  setValue(
                    Math.max(1, Math.round(parseInt(e.target.value) || 0)),
                  );
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    addRows(value);
                  }
                }}
              />
              {!isMobile ? (
                <div className={classes.rowsBtns}>
                  <button
                    type="button"
                    onClick={addRowCount}
                    className={classNames(classes.select, classes.arrowUp)}
                  ></button>
                  <button
                    type="button"
                    onClick={minusRowCount}
                    className={classNames(classes.select, classes.arrowDown)}
                  ></button>
                </div>
              ) : null}
            </div>{' '}
          </div>
        </div>
        <div className={classes.rowsInfo}>
          {rows?.length > 0 && !isMobile ? (
            <>
              <div className={classes.countWrapper}>
                <Typography className={classes.countLabel}>
                  {t('RowsCount')}
                </Typography>
                <span className={classes.count}>{rows.length}</span>
              </div>
            </>
          ) : null}
          {errors?.length > 0 && !isMobile ? (
            <div className={classes.countWrapper}>
              <Typography
                className={classNames({
                  [classes.countLabel]: true,
                  [classes.errorText]: true,
                })}
              >
                {t('ErrorCount')}
              </Typography>
              <span
                className={classNames({
                  [classes.count]: true,
                  [classes.errorCount]: true,
                })}
              >
                {errors.length}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default CustomAddRowsComponent;
