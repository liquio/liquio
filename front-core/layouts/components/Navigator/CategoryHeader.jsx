import React from 'react';
import { translate } from 'react-translate';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { Badge, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import ArrowDropUpRoundedIcon from '@mui/icons-material/ArrowDropUpRounded';
import withStyles from '@mui/styles/withStyles';

import RenderOneLine from 'helpers/renderOneLine';

const styles = (theme) => ({
  categoryWrapper: {
    display: 'block',
  },
  categoryHeader: {
    cursor: 'pointer',
    padding: '8px 13px',
    marginBottom: 8,
    borderRadius: 56,
    transition: 'all .2s ease-in-out',
    '&:hover': {
      backgroundColor: theme.categoryWrapperActive,
    },
    '&:focus-visible': {
      borderRadius: 0,
      transition: 'none',
      outline: `${theme.outlineColor} solid 3px`,
    },
    ...(theme?.categoryHeader || {}),
  },
  active: {
    borderRadius: 56,
    backgroundColor: theme.categoryWrapperActive,
    ...(theme?.categoryHeaderActive || {}),
  },
  icon: {
    color: '#000',
    position: 'relative',
    width: 24,
    height: 24,
    minWidth: 24,
    marginRight: 16,
  },
  categoryHeaderPrimary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: 500,
    lineHeight: '24px',
    letterSpacing: '0.15px',
    ...(theme?.categoryHeaderPrimary || {}),
  },
  anchor: {
    textDecoration: 'none',
    color: theme.palette.common.white,
  },
  navLink: {
    color: '#fff',
    textDecoration: 'none',
    borderRadius: 56,
    display: 'block',
  },
  emptyChildren: {
    display: 'none',
  },
  hidden: {
    display: 'none',
  },
  badge: {
    position: 'absolute',
    right: 13,
    fontSize: 11,
    fontStyle: 'normal',
    fontHeight: 500,
    lineHeight: '16px',
    letterSpacing: '0.5px',
  },
  childWrapper: {
    paddingLeft: 39,
    marginBottom: 2,
  },
});

const highlight = (pathName, id) => pathName.indexOf(id.toLowerCase()) !== -1;

const CategoryHeader = ({
  t,
  classes,
  pathname,
  id,
  title,
  icon,
  badge,
  oneChild,
  children,
  expanded,
  expandedCategory,
  isParent,
  tabIndex,
  onRedirectCallback,
}) => {
  return (
    <div
      className={classNames({
        [classes.categoryWrapper]: true,
      })}
    >
      {oneChild ? null : (
        <ListItem
          tabIndex={tabIndex && !isParent ? tabIndex : 0}
          component={'div'}
          aria-label={t(id)}
          className={classNames({
            [classes.categoryHeader]: true,
            [classes.active]: highlight(pathname, id) && !isParent,
          })}
          onClick={() => {
            onRedirectCallback && onRedirectCallback();
            expandedCategory(id);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              expandedCategory(id);
            }
          }}
        >
          {icon ? (
            <ListItemIcon className={classes.icon}>{icon}</ListItemIcon>
          ) : null}
          <ListItemText
            classes={{
              primary: classes.categoryHeaderPrimary,
            }}
          >
            <RenderOneLine title={t(title || id)} initDelay={true} />

            {isParent ? (
              <>
                {!expanded.includes(id) ? (
                  <ArrowDropDownRoundedIcon />
                ) : (
                  <ArrowDropUpRoundedIcon />
                )}
              </>
            ) : null}
          </ListItemText>

          {badge && Number.isInteger(badge) ? (
            <Badge
              badgeContent={badge}
              color="secondary"
              classes={{ badge: classes.badge }}
            />
          ) : null}
        </ListItem>
      )}

      <div
        className={classNames({
          [classes.childWrapper]: true,
          [classes.hidden]: !expanded.includes(id),
        })}
      >
        {children}
      </div>
    </div>
  );
};

CategoryHeader.propTypes = {
  classes: PropTypes.object.isRequired,
};

const isExternal = (url) => {
  const { location } = window;

  const match = url.match(
    /^([^:/?#]+:)?(?:\/\/([^/?#]*))?([^?#]+)?(\?[^#]*)?(#.*)?/,
  );
  if (
    typeof match[1] === 'string' &&
    match[1].length > 0 &&
    match[1].toLowerCase() !== location.protocol
  ) {
    return true;
  }
  if (
    typeof match[2] === 'string' &&
    match[2].length > 0 &&
    match[2].replace(
      new RegExp(
        ':(' + { 'http:': 80, 'https:': 443 }[location.protocol] + ')?$',
      ),
      '',
    ) !== location.host
  ) {
    return true;
  }
  return false;
};

const CategoryHeaderContainer = (props) => {
  const { classes, path, handleDrawerToggle, id, t } = props;

  const categoryHeader = <CategoryHeader {...props} tabIndex={-1} />;

  if (path && isExternal(path)) {
    return (
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        className={classes.anchor}
      >
        {categoryHeader}
      </a>
    );
  }

  return path ? (
    <NavLink
      exact={true}
      to={path || ''}
      target={isExternal(path) ? '_blank' : ''}
      onClick={handleDrawerToggle}
      activeClassName="active"
      className={classes.navLink}
      aria-label={t(id)}
      id={t(id)}
    >
      {categoryHeader}
    </NavLink>
  ) : (
    categoryHeader
  );
};

CategoryHeaderContainer.propTypes = {
  classes: PropTypes.object.isRequired,
  path: PropTypes.string,
  id: PropTypes.string.isRequired,
  handleDrawerToggle: PropTypes.func,
  expanded: PropTypes.array,
  expandedCategory: PropTypes.func,
};

CategoryHeaderContainer.defaultProps = {
  path: '',
  handleDrawerToggle: null,
  expanded: [],
  expandedCategory: () => {},
};

const styled = withStyles(styles)(CategoryHeaderContainer);

export default translate('Navigator')(styled);
