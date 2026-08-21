import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Tabs, Tab } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ErrorIcon from '@mui/icons-material/Error';

import evaluate from 'helpers/evaluate';

const styles = (theme) => ({
  root: {
    margin: '0 0 32px',
    [theme.breakpoints.down('lg')]: {
      margin: '0 0 20px'
    }
  },
  indicator: {
    display: 'none'
  },
  indicatorLeft: {
    left: 0,
    height: 2,
    background: '#185ABC'
  },
  indicatorRight: {
    right: 0,
    height: 2,
    background: '#185ABC'
  },
  flexContainer: {
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    margin: '4px 0 0 0'
  },
  flexContainerVertical: {
    '& button': {
      margin: 0
    }
  },
  flexContainerPositionRight: {
    alignItems: 'flex-start',
    '& button > span': {
      textAlign: 'left',
      alignItems: 'flex-start'
    }
  },
  flexContainerPositionLeft: {
    alignItems: 'flex-end',
    '& button > span': {
      textAlign: 'right',
      alignItems: 'flex-end'
    }
  },
  item: {
    background: '#F1F1F1',
    border: '2px solid #F1F1F1',
    borderRadius: 50,
    margin: '0 16px 16px 0',
    padding: '4px 16px',
    opacity: 1,
    fontSize: 13,
    lineHeight: '18px',
    ...(theme?.tabItemTextSchema || {}),
    '&:last-child': {
      marginBottom: 0
    },
    [theme.breakpoints.down('md')]: {
      margin: '0 12px 12px 0',
      minWidth: 136,
      padding: '0 10px',
      ...(theme?.tabItemTextSchema || {})
    },
    '&:focus-visible': {
      outline: '3px solid #0073E6',
      outlineOffset: '2px'
    }
  },
  active: {
    border: '2px solid #000',
    background: 'transparent'
  },
  errored: {
    border: '2px solid #ff0000'
  },
  darkTheme: {
    background: theme.chipColor,
    border: '2px solid transparent'
  },
  darkThemeColor: {
    color: theme.iconButtonFill
  },
  darkThemeActive: {
    border: `2px solid ${theme.buttonBg}`
  },
  outlined: {
    borderRadius: 50,
    background: '#F1F1F1',
    opacity: 1,
    border: '2px solid transparent',
    '& span': {
      fontSize: 13,
      lineHeight: '16px'
    }
  },
  activeOutlined: {
    border: '2px solid #000',
    borderRadius: 50,
    background: '#fff',
    opacity: 1
  },
  warningIcon: {
    color: '#CA2F28'
  },
  tabRoot: {
    minHeight: 48
  },
  tabsFlexNoWrap: {
    '& .MuiTabs-flexContainer': {
      ...(theme?.tabsFlexNoWrap || {})
    }
  }
});

const ChipTabs = ({
  classes,
  className,
  activeIndex,
  onChange,
  tabs,
  readOnly,
  errored,
  orientation,
  position,
  darkTheme,
  variant,
  nativeStyle,
  activeTabStyle,
  rootDocument
}) => (
  <Tabs
    value={activeIndex}
    onChange={onChange}
    variant="scrollable"
    textColor="inherit"
    scrollButtons={false}
    orientation={orientation}
    className={classNames({
      [classes.flexContainerPositionRight]: orientation && position === 'right' && !nativeStyle,
      [classes.flexContainerPositionLeft]: orientation && position === 'left' && !nativeStyle,
      [classes.flexContainerVertical]: orientation === 'vertical' && !nativeStyle,
      [classes.flexContainer]: !orientation && !nativeStyle,
      [classes.tabsFlexNoWrap]: true
    })}
    classes={{
      root: classNames({
        [classes.root]: !nativeStyle
      }),
      indicator: classNames({
        [classes.indicatorRight]: orientation && position && position === 'left' && !nativeStyle,
        [classes.indicatorLeft]: orientation && position && position === 'left' && !nativeStyle,
        [classes.indicator]: !(orientation && position) && !nativeStyle
      }),
      flexContainer: classNames({
        [classes.flexContainer]: !nativeStyle
      })
    }}
  >
    {tabs.map(({ title, hidden, showWarning }, index) => {
      if (hidden) return null;

      const warning = evaluate(showWarning || '() => false', rootDocument?.data || {}, index);

      return (
        <Tab
          key={index}
          label={title}
          disabled={readOnly}
          icon={warning ? <ErrorIcon className={classes.warningIcon} /> : null}
          iconPosition="start"
          tabIndex={0}
          className={classNames(
            {
              [classes.tabRoot]: warning,
              [classes.item]: !orientation && !nativeStyle,
              [classes.outlined]: variant === 'outlined' && !nativeStyle,
              [classes.activeOutlined]:
                index === activeIndex && variant === 'outlined' && !nativeStyle,
              [classes.active]: index === activeIndex && !orientation && !nativeStyle,
              [activeTabStyle]: index === activeIndex && activeTabStyle,
              [classes.errored]: (errored || []).includes(index) && !nativeStyle,
              [classes.darkTheme]: darkTheme && !nativeStyle,
              [classes.darkThemeColor]: darkTheme,
              [classes.darkThemeActive]: index === activeIndex && darkTheme && !nativeStyle
            },
            className
          )}
        />
      );
    })}
  </Tabs>
);

ChipTabs.propTypes = {
  classes: PropTypes.object.isRequired,
  activeIndex: PropTypes.number,
  onChange: PropTypes.func,
  tabs: PropTypes.array,
  className: PropTypes.object,
  errored: PropTypes.array,
  darkTheme: PropTypes.bool,
  variant: PropTypes.string,
  nativeStyle: PropTypes.bool,
  activeTabStyle: PropTypes.object
};

ChipTabs.defaultProps = {
  activeIndex: 0,
  onChange: () => null,
  tabs: [],
  className: {},
  errored: [],
  darkTheme: false,
  variant: 'default',
  nativeStyle: false,
  activeTabStyle: false
};

export default withStyles(styles)(ChipTabs);
