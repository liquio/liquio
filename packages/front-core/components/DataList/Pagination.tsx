import React, { Fragment } from 'react';
import { translate } from 'react-translate';
import _ from 'lodash/fp';
import classNames from 'classnames';
import { Toolbar, Typography, Chip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

type AppTheme = Theme & {
  outlineColor?: string;
};

const styles = (theme: AppTheme) => ({
  root: {
    padding: 0
  },
  arrowButton: {
    display: 'flex',
    position: 'relative' as const,
    alignItems: 'center',
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline'
    }
  },
  disabledArrowButton: {
    color: theme?.palette?.text?.disabled,
    '& > .MuiTypography-root': {
      color: theme?.palette?.text?.disabled
    }
  },
  pagesWrapper: {
    flexGrow: 1,
    textAlign: 'center' as const
  },
  pages: {
    position: 'relative' as const,
    alignItems: 'center'
  },
  divider: {
    display: 'inline-flex'
  },
  chip: {
    backgroundColor: 'transparent !important',
    border: 'transparent 2px solid',
    height: 45,
    width: 45,
    borderRadius: 45,
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
      backgroundColor: 'transparent',
      boxShadow: 'none'
    },
    [theme.breakpoints.down('md')]: {
      height: 35,
      width: 35
    },
    '&:focus-visible': {
      outline: `${theme?.outlineColor || theme?.palette?.primary?.main} solid 2px`,
      outlineOffset: '2px'
    }
  },
  activeChip: {
    border: `2px solid ${theme?.palette?.text?.primary}`,
    cursor: 'default',
    '&:hover': {
      textDecoration: 'none',
      backgroundColor: 'transparent',
      boxShadow: 'none'
    }
  },
  chipLabel: {
    padding: 0,
    paddingLeft: 1,
    paddingRight: 1,
    [theme.breakpoints.down('md')]: {
      fontSize: 11
    }
  },
  arrowButtonText: {
    [theme.breakpoints.down('md')]: {
      display: 'none'
    }
  }
});

interface PaginationProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  onChangePage?: (page: number) => void;
  count?: number;
  page?: number;
  rowsPerPage?: number;
}

class Pagination extends React.Component<PaginationProps> {
  static defaultProps: Partial<PaginationProps> = {
    onChangePage: () => null,
    count: 0,
    page: 1,
    rowsPerPage: 10
  };

  getPageCount = () => {
    const { count, rowsPerPage } = this.props;
    return Math.ceil((count as number) / (rowsPerPage as number));
  };

  getCurrentPage = () => {
    const { page: current } = this.props;
    return current as number;
  };

  getPages = () => {
    const current = this.getCurrentPage();
    const pageCount = this.getPageCount();
    const pages: number[] = [];
    for (let i = 0; i < pageCount; i++) {
      pages[i] = i + 1;
    }

    return _.uniq(pages.filter((page) => Math.abs(page - current) < 3).concat(1, pageCount)).sort(
      (a, b) => a - b
    );
  };

  handleSetPage = (page: number) => () => {
    const { onChangePage } = this.props;
    const pageCount = this.getPageCount();
    const current = this.getCurrentPage();
    if (current === page || page < 1 || page > pageCount) {
      return;
    }

    onChangePage!(page - 1);
  };

  componentDidUpdate() {
    const { onChangePage } = this.props;
    const pageCount = this.getPageCount();
    const current = this.getCurrentPage();

    if (current > pageCount) {
      onChangePage!(pageCount - 1);
    }
  }

  render() {
    const { t, classes } = this.props;

    const pages = this.getPages();
    const current = this.getCurrentPage();
    const pageCount = this.getPageCount();

    if (pages.length === 1) return null;

    return (
      <Toolbar className={classes.root}>
        <div
          onClick={this.handleSetPage(current - 1)}
          className={classNames(classes.arrowButton, {
            [classes.disabledArrowButton]: current === 1
          })}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              this.handleSetPage(current - 1)();
            }
          }}
        >
          <ArrowBackIcon />
          <Typography variant="body1" className={classes.arrowButtonText}>
            {t('Back')}
          </Typography>
        </div>
        <div className={classes.pagesWrapper}>
          <div className={classes.pages}>
            {pages.map((page, index) => (
              <Fragment key={index}>
                {pages.includes(page - 1) || page === 1 ? null : (
                  <Typography variant="body1" className={classes.divider}>
                    ...
                  </Typography>
                )}
                <Chip
                  label={page}
                  className={classNames(classes.chip, {
                    [classes.activeChip]: page === current
                  })}
                  classes={{
                    label: classes.chipLabel
                  }}
                  onClick={this.handleSetPage(page)}
                  tabIndex={0}
                />
              </Fragment>
            ))}
          </div>
        </div>
        <div
          onClick={this.handleSetPage(current + 1)}
          className={classNames(classes.arrowButton, {
            [classes.disabledArrowButton]: current === pageCount
          })}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              this.handleSetPage(current + 1)();
            }
          }}
        >
          <Typography variant="body1" className={classes.arrowButtonText}>
            {t('Forward')}
          </Typography>
          <ArrowForwardIcon />
        </div>
      </Toolbar>
    );
  }
}

const styled = withStyles(styles)(Pagination as never);
export default translate('DataList')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
