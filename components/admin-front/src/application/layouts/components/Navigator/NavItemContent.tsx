/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { connect } from 'react-redux';
import { ListItem, ListItemIcon, ListItemText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';
import { history } from 'store';

const styles = (theme: any) => ({
  itemTextRoot: {
    margin: 0,
  },
  listItem: {
    background: 'none',
    padding: 0,
    '&:hover': {
      background: 'none',
    },
    '& svg': {
      fill: theme.navigator.fillIcon,
    },
  },
  title: {
    fontWeight: 500,
    fontSize: 20,
    lineHeight: '24px',
    letterSpacing: '0.15px',
    color: theme.navigator.navItemContent.color,
  },
  icon: {
    minWidth: 'auto',
    height: '24px',
    width: '24px',
    marginRight: '12px',
    '& svg': {
      fontSize: 24,
    },
  },
  /* if item is a child in the menu */
  childItem: {
    padding: '8px 0 8px 52px',
    margin: 0,
    '&:hover': {
      background: theme.navigator.navItemContent.linkActiveBg,
    },
    '& svg': {
      fill: theme.navigator.childItem.svg.fill,
      backgroundColor: theme.navigator.childItem.svg.bg,
    },
  },
});

const NavItemContent = (props: any) => {
  const { t, classes, path, icon, title, id, childItem, mainScrollbar } = props;
  const {
    location: { pathname },
  } = history;
  const itemRef = React.useRef<HTMLLIElement | null>(null);
  if (
    mainScrollbar &&
    mainScrollbar?.ref &&
    pathname === path &&
    itemRef &&
    itemRef?.current
  ) {
    const navContainer =
      mainScrollbar?.ref?._container?.getBoundingClientRect();
    const itemElem = itemRef?.current?.getBoundingClientRect();
    const itemBottomPosition = itemElem?.bottom - navContainer?.top;
    const paddingBottom = 40;
    if (itemBottomPosition > navContainer.height) {
      mainScrollbar.ref._container.scrollTop =
        itemBottomPosition - navContainer.height + paddingBottom;
      mainScrollbar.ref.updateScroll();
    }
  }

  return (
    <ListItem
      className={classes.listItem}
      disableRipple
      ref={itemRef as any}
      {...({ button: !!path } as any)}
    >
      {!childItem && icon ? (
        <ListItemIcon className={classes.icon}>{icon}</ListItemIcon>
      ) : null}
      <ListItemText
        classes={{
          root: classes.itemTextRoot,
          primary: !childItem && classes.title,
        }}
        className={classNames({ [classes.childItem]: childItem })}
        primary={t(title || id)}
      />
    </ListItem>
  );
};
const mapStateToProps = ({ app: { mainScrollbar } }: any) => ({ mainScrollbar });
const styled = withStyles(styles as any)(connect(mapStateToProps)(NavItemContent as any) as any);

export default styled;
