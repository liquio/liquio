import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Hidden from '@mui/material/Hidden';
import Link from '@mui/material/Link';
import { makeStyles } from '@mui/styles';
import classNames from 'classnames';
import MobileDetect from 'mobile-detect';
import PropTypes from 'prop-types';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import { setOpenSidebar } from 'actions/app';
import { history } from 'store';

const useStyles = makeStyles((theme) => ({
  root: {
    marginLeft: 40,
    marginTop: 32,
    [theme.breakpoints.down('sm')]: {
      marginLeft: 15
    }
  },
  cursor: {
    cursor: 'pointer',
    display: 'inline-grid'
  },
  borderTransparent: {
    borderBottom: '1px solid transparent'
  },
  border: {
    borderBottom: '1px solid #000'
  },
  separator: {
    width: 20,
    height: 20,
    color: '#444444'
  },
  flex: {
    display: 'flex',
    alignItems: 'center'
  },
  icon: {
    marginRight: 10
  },
  link: {
    outlineOffset: 3,
    '&:focus-visible': {
      outline: `${theme.outlineColor} solid 3px`
    }
  }
}));

const BasicBreadcrumbs = ({ breadcrumbs }) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });

  const handleRedirect = React.useCallback(
    (link, callback) => {
      history.push(link);
      callback && callback();
      !isMobile && setTimeout(() => dispatch(setOpenSidebar(true)), 100);
    },
    [dispatch, isMobile]
  );

  if (breadcrumbs.length === 0) {
    return null;
  }
  return (
    <div className={classes.root}>
      <Hidden mdDown={true}>
        <Breadcrumbs
          aria-label="breadcrumb"
          separator={<ChevronRightOutlinedIcon className={classes.separator} />}
        >
          {breadcrumbs.map((breadcrumb, index) => {
            const last = index === breadcrumbs.length - 1;

            return (
              <Link
                component="button"
                key={breadcrumb.label}
                underline={'none'}
                color="textPrimary"
                variant="breadcrumbs"
                tabIndex={last ? -1 : 0}
                arial-label={breadcrumb.label}
                className={classNames({
                  [classes.link]: true,
                  [classes.cursor]: !last
                })}
                onClick={() => handleRedirect(breadcrumb.link, breadcrumb.callback)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleRedirect(breadcrumb.link, breadcrumb.callback);
                  }
                }}
              >
                {breadcrumb.label}
                <span
                  className={classNames({
                    [classes.borderTransparent]: true,
                    [classes.border]: !last
                  })}
                />
              </Link>
            );
          })}
        </Breadcrumbs>
      </Hidden>

      <Hidden mdUp={true}>
        <Link
          component="button"
          key={breadcrumbs[0]?.label}
          underline={'none'}
          color="textPrimary"
          variant="breadcrumbs"
          tabIndex={0}
          arial-label={breadcrumbs[0]?.label}
          className={classNames({
            [classes.cursor]: true,
            [classes.flex]: true
          })}
          onClick={() => handleRedirect(breadcrumbs[0]?.link, breadcrumbs[0]?.callback)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleRedirect(breadcrumbs[0]?.link, breadcrumbs[0]?.callback);
            }
          }}
        >
          <KeyboardBackspaceIcon className={classes.icon} />
          {breadcrumbs[0]?.label}
        </Link>
      </Hidden>
    </div>
  );
};

BasicBreadcrumbs.propTypes = {
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      link: PropTypes.string.isRequired
    })
  ).isRequired
};

export default BasicBreadcrumbs;
