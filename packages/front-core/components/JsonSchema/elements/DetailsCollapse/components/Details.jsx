import React from 'react';
import { translate } from 'react-translate';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import { Button, Collapse } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import TextBlock from 'components/JsonSchema/elements/TextBlock';

const styles = () => ({
  content: {
    paddingBottom: 16,
  },
  detailButton: {
    maxWidth: 640,
    borderRadius: 0,
    padding: 8,
  },
  detailWrap: {
    margin: '24px 0',
  },
});

const DetailsCollapse = ({
  t,
  classes,
  htmlBlock,
  params,
  rootDocument,
  collapseText,
  openText,
  dataMapping,
  parentValue,
  useParentData,
  stepName,
  pure,
}) => {
  const [collapsed, toggleCollapse] = React.useState(false);

  return (
    <div className={classes.detailWrap}>
      {!collapsed ? (
        <Button
          className={classes.detailButton}
          onClick={() => toggleCollapse(!collapsed)}
          aria-label={openText || t('Open')}
        >
          {openText || t('Open')}
          <ArrowDropDownIcon className={classes.dropdownIcon} />
        </Button>
      ) : null}
      <Collapse in={collapsed} timeout={500}>
        <div className={classes.content}>
          <TextBlock
            useParentData={useParentData}
            htmlBlock={htmlBlock}
            params={params}
            parentValue={parentValue}
            rootDocument={rootDocument}
            dataMapping={dataMapping}
            stepName={stepName}
            pure={pure}
          />
        </div>
      </Collapse>
      {collapsed ? (
        <Button
          className={classes.detailButton}
          onClick={() => toggleCollapse(!collapsed)}
          aria-label={collapseText || t('Close')}
        >
          {collapseText || t('Close')}
          <ArrowDropUpIcon className={classes.dropdownIcon} />
        </Button>
      ) : null}
    </div>
  );
};

const translated = translate('Elements')(DetailsCollapse);
export default withStyles(styles)(translated);
