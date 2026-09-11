/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import classNames from 'classnames';
import MobileDetect from 'mobile-detect';
import { makeStyles } from '@mui/styles';
import { IconButton } from '@mui/material';
import ChipTabs from 'components/ChipTabs';
import SchemaForm from 'components/JsonSchema/SchemaForm';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TabsContainer from './TabsContainer';
import { useTabs } from './useTabs';

const useStyles = makeStyles((theme) => ({
  chips: {
    margin: '4px 15px 15px 0px',
  },
  isMobile: {
    margin: 0,
    padding: 0,
  },
  isMobileChip: {
    margin: 0,
    padding: 0,
    paddingLeft: 15,
    borderLeft: '1px solid #e6e6e6',
  },
  expandMore: {
    marginBottom: 20,
    marginLeft: -12,
  },
  outlined: {
    ...(theme?.tabItemSchema || {}),
    ...(theme?.outlinedTabs || {}),
  },
  activeTabStyle: {
    borderLeft: '1px solid #004BC1',
    ...(theme?.containedActiveTabs || {}),
  },
  outlinedActiveTabStyle: {
    ...(theme?.outlinedActiveTabs || {}),
  },
}));

const CHIPS_LIMIT = 5;

const TabsControl = (props) => {
  const {
    path,
    value,
    errors,
    hidden,
    variant,
    readOnly,
    onChange,
    properties,
    parentValue,
    options,
    rootDocument,
    options: { orientation, position, columnLeft, columnRight } = {},
    ...rest
  } = props;
  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    return !!md.mobile();
  });
  const [expanded, setExpanded] = React.useState(false);

  const classes = useStyles();
  const { tabs, errored, activeTab, activeSchema, handleChange, tabKey } =
    useTabs(props);

  if (hidden) return null;

  const chipsList = tabs
    .map((key) => ({
      id: key,
      title: properties[key].description,
      showWarning: properties[key].showWarning,
    }))
    .filter((_, index) => {
      if (expanded) return true;
      if (isMobile && !expanded && index >= CHIPS_LIMIT) return false;
      return true;
    });

  if (!chipsList.length) return null;

  return (
    <ElementContainer maxWidth={'unset'}>
      <TabsContainer
        isMobile={isMobile}
        position={position}
        orientation={orientation}
        columnProperties={[columnLeft, columnRight]}
      >
        <>
          <ChipTabs
            errored={errored}
            activeIndex={activeTab}
            activeTabStyle={classNames({
              [classes.activeTabStyle]: variant !== 'outlined',
              [classes.outlinedActiveTabStyle]: variant === 'outlined',
            })}
            variant={variant}
            rootDocument={rootDocument}
            onChange={handleChange}
            tabs={chipsList}
            readOnly={readOnly}
            orientation={orientation}
            position={position}
            className={classNames({
              [classes.chips]: true,
              [classes.outlined]: variant === 'outlined',
              [classes.isMobileChip]: isMobile && options,
            })}
            classes={{
              root: classNames({
                [classes.isMobile]: isMobile && options,
              }),
            }}
          />

          {isMobile && tabs.length > CHIPS_LIMIT ? (
            <IconButton
              onClick={() => setExpanded(!expanded)}
              className={classNames({
                [classes.expandMore]: isMobile,
              })}
              aria-label={expanded ? 'Less' : 'More'}
            >
              {expanded ? <ExpandLessIcon /> : <MoreHorizIcon />}
            </IconButton>
          ) : null}
        </>

        <SchemaForm
          {...rest}
          rootDocument={rootDocument}
          errors={errors}
          schema={{ ...activeSchema, description: '' }}
          path={path.concat(tabKey)}
          readOnly={readOnly || activeSchema.readOnly}
          value={(value || {})[tabKey]}
          onChange={onChange.bind(null, tabKey)}
          parentValue={parentValue}
        />
      </TabsContainer>
    </ElementContainer>
  );
};

export default TabsControl;
