import React from 'react';
import classNames from 'classnames';
import NumberFormat from 'react-number-format';
import { Select, MenuItem, IconButton, TextField, Tooltip } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';

type AppTheme = Theme & {
  buttonHoverBg?: string;
  listBackground?: Record<string, unknown>;
  header?: { textColor?: string };
  listHover?: string;
};

const styles = (theme: AppTheme) => ({
  actionsWrapper: {
    padding: '0px 5px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 25,
    [theme.breakpoints.down('md')]: {
      textAlign: 'center',
      padding: 0
    },
    color: theme?.palette?.text?.primary
  },
  perPageWrapper: {
    display: 'flex',
    alignItems: 'center',
    [theme.breakpoints.down('md')]: {
      justifyContent: 'center'
    }
  },
  perPageWrapperText: {
    paddingRight: 7,
    paddingLeft: 7
  },
  perPageitem: {
    color: theme?.palette?.text?.primary,
    fontSize: 14,
    lineHeight: '16px',
    height: 32,
    marginRight: 10
  },
  perPageitemActive: {
    border: `2px solid ${theme?.palette?.text?.primary}`
  },
  paginationState: {
    fontSize: 14,
    lineHeight: '16px',
    marginLeft: 40,
    [theme.breakpoints.down('md')]: {
      minWidth: 100
    }
  },
  paginationItems: {
    fontSize: 14,
    display: 'flex',
    cursor: 'pointer',
    alignItems: 'center',
    position: 'relative' as const,
    '&:last-child': {
      marginRight: 0
    },
    [theme.breakpoints.down('md')]: {
      marginRight: 0,
      marginBottom: 10,
      marginTop: 10,
      width: '100%',
      justifyContent: 'center'
    }
  },
  pageInput: {
    marginRight: 7,
    '& fieldset': {
      borderColor: 'transparent'
    },
    '& input': {
      textAlign: 'center' as const
    }
  },
  pageInputDark: {
    '& input': {
      backgroundColor: theme?.buttonHoverBg,
      borderRadius: '4px 4px 0px 0px',
      padding: 5,
      textAlign: 'center' as const
    }
  },
  disabled: {
    opacity: 0.4,
    pointerEvents: 'none' as const
  },
  lastPageValueWrapper: {
    paddingLeft: 7
  },
  flexActionsBlock: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    [theme.breakpoints.down('md')]: {
      width: '100%'
    }
  },
  toFirstPage: {
    width: 25,
    height: 25,
    right: 2,
    '& svg': {
      position: 'absolute' as const,
      left: -2
    },
    '& svg:first-child': {
      left: 5
    }
  },
  toLastPage: {
    width: 25,
    height: 25,
    left: 2,
    '& svg': {
      position: 'absolute' as const,
      right: -2
    },
    '& svg:last-child': {
      right: 5
    }
  },
  mr5: {
    marginRight: 5
  },
  ml5: {
    marginLeft: 5
  },
  m5: {
    marginLeft: 5,
    marginRight: 5
  },
  iconButton: {
    padding: 2,
    width: 28,
    height: 28
  },
  darkThemePaper: {
    ...(theme?.listBackground || {}),
    '& li': {
      color: theme?.header?.textColor,
      paddingTop: 10,
      paddingBottom: 10,
      '&:hover': {
        background: theme?.listHover
      }
    }
  },
  darkThemeLabel: {
    '& fieldset': {
      borderColor: 'transparent'
    },
    '& label': {
      color: theme?.palette?.primary?.contrastText
    }
  },
  darkThemeSelect: {
    color: theme?.header?.textColor,
    backgroundColor: theme?.buttonHoverBg,
    borderRadius: '4px 4px 0px 0px',
    padding: 5
  },
  loading: {
    color: theme?.palette?.text?.secondary,
    pointerEvents: 'none' as const
  }
});

interface NumberFormatCustomProps {
  ref?: React.Ref<HTMLInputElement>;
  format?: string | null;
  [key: string]: unknown;
}

const NumberFormatCustom = ({ ref, format, ...props }: NumberFormatCustomProps) => (
  <NumberFormat {...(props as Record<string, unknown>)} getInputRef={ref} format={format as never} thousandSeparator={''} />
);

const countInputWidth = (page: number) => ((page + '').length + 1) * 12;

interface DataTablePaginationProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  rowsPerPage?: number;
  page?: number;
  count?: number;
  classes: Record<string, string>;
  onChangeRowsPerPage?: ((value: number) => void) | null;
  onChangePage?: ((page: number) => void) | null;
  withPerPage?: boolean;
  darkTheme?: boolean;
  loading?: boolean;
}

const DataTablePagination = ({
  t,
  rowsPerPage = 10,
  page: pageOrigin = 0,
  count = 0,
  classes,
  onChangeRowsPerPage,
  onChangePage,
  withPerPage = true,
  darkTheme,
  loading = false
}: DataTablePaginationProps) => {
  const [perPageValue, setPerPage] = React.useState(rowsPerPage || 10);
  // Preserved as-is: only the state VALUE is destructured, not its setter,
  // and `timeout` is reassigned directly below rather than through
  // `setTimeout` (React's setter) — a real, pre-existing stale-closure bug
  // where this local binding resets to `null` on every re-render, so
  // `clearTimeout(timeout)` on a fresh keystroke almost always clears
  // nothing and old pending timeouts pile up uncancelled. Not "fixed" here.
  let [timeout] = React.useState<ReturnType<typeof globalThis.setTimeout> | null>(null);

  const page = pageOrigin < 0 || Number.isNaN(pageOrigin) ? 0 : pageOrigin;

  const lastPageValue = Math.ceil(count / rowsPerPage);
  const isLastPage = lastPageValue === page + 1 || !count;
  const isFirstPage = page === 0;
  let lastValueOnPage = page * rowsPerPage + perPageValue;
  lastValueOnPage = lastValueOnPage > count ? count : lastValueOnPage;

  return (
    <div
      className={classNames({
        [classes.actionsWrapper]: true,
        [classes.loading]: loading
      })}
    >
      {withPerPage ? (
        <div className={classes.perPageWrapper}>
          <span className={classes.perPageWrapperText}>{t('PerPageText')}</span>

          <Select
            variant="standard"
            value={perPageValue}
            className={classNames({
              [classes.pageInput]: true,
              [classes.pageInputDark]: !!darkTheme
            })}
            MenuProps={{
              classes: {
                paper: classNames({
                  [classes.darkThemePaper]: !!darkTheme
                })
              }
            }}
            classes={{
              select: classNames({
                [classes.darkThemeSelect]: !!darkTheme
              })
            }}
            onChange={({ target: { value } }) => {
              setPerPage(value as number);
              onChangeRowsPerPage?.(value as number);
            }}
          >
            {[10, 50, 100].map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </Select>
        </div>
      ) : null}

      <div
        className={classNames({
          [classes.flexActionsBlock]: true
        })}
      >
        <div className={classes.paginationItems}>
          <Tooltip title={t('toFirstPage')}>
            <div>
              <IconButton
                onClick={() => onChangePage?.(0)}
                className={classes.iconButton}
                disabled={isFirstPage}
                size="large"
              >
                <div
                  className={classNames({
                    [classes.paginationItems]: true,
                    [classes.toFirstPage]: true,
                    [classes.disabled]: isFirstPage,
                    [classes.paginationItemsDark]: !!darkTheme
                  })}
                >
                  <NavigateBeforeIcon />
                  <NavigateBeforeIcon />
                </div>
              </IconButton>
            </div>
          </Tooltip>
          <Tooltip title={t('toPrevPage')}>
            <div>
              <IconButton
                onClick={() => onChangePage?.(page - 1)}
                className={classes.iconButton}
                disabled={isFirstPage}
                size="large"
              >
                <div
                  className={classNames({
                    [classes.paginationItems]: true,
                    [classes.disabled]: isFirstPage,
                    [classes.paginationItemsDark]: !!darkTheme
                  })}
                >
                  <NavigateBeforeIcon />
                </div>
              </IconButton>
            </div>
          </Tooltip>

          <div
            className={classNames({
              [classes.paginationItems]: true,
              [classes.initialCursor]: true,
              [classes.m5]: true
            })}
          >
            <TextField
              variant="standard"
              style={{
                width: countInputWidth(page)
              }}
              className={classNames({
                [classes.pageInput]: true,
                [classes.pageInputDark]: !!darkTheme
              })}
              value={count ? page + 1 : 0}
              onChange={({ target: { value } }) => {
                clearTimeout(timeout as ReturnType<typeof globalThis.setTimeout>);
                timeout = setTimeout(() => {
                  const newValue = Number(value) - 1;
                  if (newValue > lastPageValue) {
                    onChangePage?.(lastPageValue - 1);
                    return;
                  }
                  const check = newValue > lastPageValue ? lastPageValue - 1 : newValue;
                  onChangePage?.(check);
                }, 500);
              }}
              InputProps={{
                readOnly: !count,
                inputComponent: NumberFormatCustom as never
              }}
            />

            <>
              {t('From')} <span className={classes.lastPageValueWrapper}>{lastPageValue}</span>
            </>
          </div>

          <Tooltip title={t('toNextPage')}>
            <div>
              <IconButton
                onClick={() => onChangePage?.(page + 1)}
                className={classes.iconButton}
                disabled={isLastPage}
                size="large"
              >
                <div
                  className={classNames({
                    [classes.paginationItems]: true,
                    [classes.disabled]: isLastPage,
                    [classes.paginationItemsDark]: !!darkTheme
                  })}
                >
                  <NavigateNextIcon />
                </div>
              </IconButton>
            </div>
          </Tooltip>
          <Tooltip title={t('toLastPage')}>
            <div>
              <IconButton
                onClick={() => onChangePage?.(lastPageValue - 1)}
                className={classes.iconButton}
                disabled={isLastPage}
                size="large"
              >
                <div
                  className={classNames({
                    [classes.paginationItems]: true,
                    [classes.toLastPage]: true,
                    [classes.disabled]: isLastPage,
                    [classes.paginationItemsDark]: !!darkTheme
                  })}
                >
                  <NavigateNextIcon />
                  <NavigateNextIcon />
                </div>
              </IconButton>
            </div>
          </Tooltip>
        </div>

        <div className={classes.paginationState}>
          {count ? page * rowsPerPage + 1 : 0}
          {' - '}
          {lastValueOnPage} {t('From')} {count}
        </div>
      </div>
    </div>
  );
};

export default withStyles(styles)(DataTablePagination as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
