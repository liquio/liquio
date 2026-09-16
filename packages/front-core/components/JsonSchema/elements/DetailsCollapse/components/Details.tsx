import React from 'react';
import { translate, Translate } from 'react-translate';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import { Button, Collapse } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
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

interface DetailsProps extends WithStyles<typeof styles> {
  t: Translate;
  htmlBlock?: string;
  params?: Record<string, unknown> | null;
  rootDocument: { data: Record<string, unknown> };
  collapseText?: string | null;
  openText?: string | null;
  dataMapping?: string;
  parentValue?: Record<string, unknown>;
  useParentData?: boolean;
  stepName?: string;
  pure?: boolean;
}

const Details = ({
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
}: DetailsProps) => {
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
          {/* `classes.dropdownIcon` is never defined in this file's styles — always a no-op. Preserved as-is. */}
          <ArrowDropDownIcon className={(classes as Record<string, string>).dropdownIcon} />
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
          <ArrowDropUpIcon className={(classes as Record<string, string>).dropdownIcon} />
        </Button>
      ) : null}
    </div>
  );
};

const translated = translate('Elements')(Details);
export default withStyles(styles)(translated);
