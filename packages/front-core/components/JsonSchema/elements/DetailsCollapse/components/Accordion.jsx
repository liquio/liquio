import React from 'react';
import classNames from 'classnames';
import { translate } from 'react-translate';
import {
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import evaluate from 'helpers/evaluate';
import TextBlock from 'components/JsonSchema/elements/TextBlock';

const styles = (theme) => ({
  accordionItem: {
    borderTop: '2px solid #000',
    borderBottom: '2px solid #000',
    '& + .acc-collapse-item': {
      borderTop: 'none',
    },
  },
  mbLastChild: {
    marginBottom: '36px',
    [theme.breakpoints.down('lg')]: {
      marginBottom: '24px',
    },
  },
  rootAccordion: {
    maxWidth: 640,
    background: '#fff',
    padding: '0',
    transition: '0.3s all linear',
    '& > div:first-child': {
      transition: '0.3s all linear',
    },
    /* behaviour for desktop browsers */
    '@media (hover: hover)': {
      '&:hover:not(.Mui-expanded)': {
        backgroundColor: '#000',
        '& > div:first-child': {
          paddingLeft: 40,
          paddingRight: 32,
          [theme.breakpoints.down('lg')]: {
            paddingLeft: 24,
            paddingRight: 16,
          },
          '& *': {
            color: '#fff',
          },
        },
      },
    },
    '&:before': {
      display: 'none',
    },
  },
  expanded: {
    '&.Mui-expanded': {
      margin: 0,
    },
  },
  summary: {
    padding: '40px 0',
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    [theme.breakpoints.down('lg')]: {
      padding: '24px 0',
    },
    '&.Mui-expanded': {
      minHeight: 'auto',
      paddingBottom: 32,
      [theme.breakpoints.down('lg')]: {
        paddingBottom: 12,
      },
    },
  },
  summaryContent: {
    margin: '0 !important',
    display: 'flex',
    alignItems: 'center',
    maxWidth: 'calc(100% - 64px)',
  },
  summaryExpandIcon: {
    marginRight: -8,
    flex: '0 0 40px',
    height: '40px',
  },
  titleRoot: {
    fontSize: 28,
    lineHeight: '32px',
    [theme.breakpoints.down('lg')]: {
      fontSize: 20,
      lineHeight: '24px',
    },
  },
  detailsRoot: {
    padding: '0 0 40px ',
    [theme.breakpoints.down('lg')]: {
      padding: '0 0 20px',
    },
  },
  expandIconRoot: {
    color: '#000',
  },
  fullWidth: {
    maxWidth: '100%',
  },
});

const AccordionCollapse = ({
  t,
  classes,
  htmlBlock,
  params,
  rootDocument,
  openText,
  dataMapping,
  parentValue,
  useParentData,
  stepName,
  pure,
  fullWidth,
  option,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const ExpandIcon = expanded ? RemoveIcon : AddIcon;

  let evalateTitle = evaluate(openText, option);

  if (evalateTitle instanceof Error) {
    evalateTitle = openText;
  }

  return (
    <Accordion
      expanded={expanded}
      classes={{ root: classes.rootAccordion, expanded: classes.expanded }}
      className={classNames(classes.accordionItem, 'acc-collapse-item', {
        [classes.fullWidth]: fullWidth,
      })}
      component="section"
      elevation={0}
      square={true}
    >
      <AccordionSummary
        classes={{
          root: classes.summary,
          content: classes.summaryContent,
          expandIcon: classes.summaryExpandIcon,
        }}
        onClick={() => setExpanded(!expanded)}
        expandIcon={
          <ExpandIcon
            fontSize="medium"
            classes={{ root: classes.expandIconRoot }}
          />
        }
      >
        <Typography classes={{ root: classes.titleRoot }}>
          {evalateTitle || t('Open')}
        </Typography>
      </AccordionSummary>
      <AccordionDetails classes={{ root: classes.detailsRoot }}>
        <TextBlock
          useParentData={useParentData}
          htmlBlock={htmlBlock}
          params={params}
          parentValue={option || parentValue}
          rootDocument={option ? { data: option } : rootDocument}
          dataMapping={dataMapping}
          stepName={stepName}
          pure={pure}
        />
      </AccordionDetails>
    </Accordion>
  );
};

const translated = translate('Elements')(AccordionCollapse);
export default withStyles(styles)(translated);
