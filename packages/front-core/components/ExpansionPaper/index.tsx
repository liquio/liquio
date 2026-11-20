import React, { Fragment } from 'react';
import { Accordion, AccordionSummary, Typography, AccordionDetails } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

type AppTheme = Theme & {
  outlineColor?: string;
};

const styles = (theme: AppTheme) => ({
  panel: {
    background: 'none',
    margin: '15px 0!important',
    padding: 0,
    [theme.breakpoints.down('md')]: {
      margin: 0,
      padding: 0
    },
    '&:before': {
      display: 'none'
    }
  },
  summary: {
    margin: '15px 0',
    display: 'block',
    [theme.breakpoints.down('md')]: {
      margin: '16px 0'
    }
  },
  summaryRoot: {
    padding: 0,
    '&:focus-visible': {
      outline: `3px solid ${theme?.outlineColor || theme?.palette?.primary?.main}`,
      outlineOffset: '2px'
    }
  },
  details: {
    display: 'block',
    padding: 0
  },
  colorPrimary: {
    color: theme?.palette?.text?.primary
  },
  subTitle: {
    paddingTop: 10,
    paddingRight: 64,
    maxWidth: 600
  },
  title: {
    maxWidth: 600,
    [theme.breakpoints.down('md')]: {
      fontSize: 18,
      lineHeight: '24px'
    }
  },
  titleImportant: {
    fontSize: 28,
    lineHeight: '32px'
  },
  expandIcon: {
    [theme.breakpoints.down('md')]: {
      fontSize: 18
    }
  }
});

interface ExpansionPaperProps {
  classes: Record<string, string>;
  title?: string;
  subTitle?: string;
  subTitle2?: string;
  children: React.ReactNode;
  titleImportant?: boolean;
  defaultExpanded?: boolean;
}

const ExpansionPaper = ({
  classes,
  title = '',
  subTitle = '',
  subTitle2 = '',
  children,
  titleImportant = false,
  defaultExpanded = false
}: ExpansionPaperProps) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const ExpandIcon = expanded ? RemoveIcon : AddIcon;

  return (
    <Accordion expanded={expanded} className={classes.panel}>
      <AccordionSummary
        classes={{
          root: classes.summaryRoot,
          content: classes.summary
        }}
        onClick={() => setExpanded(!expanded)}
        expandIcon={
          <ExpandIcon
            fontSize="large"
            color="primary"
            className={classes.expandIcon}
            classes={{ colorPrimary: classes.colorPrimary }}
          />
        }
      >
        {title ? (
          <Typography
            variant={'stepsTitle' as never}
            className={titleImportant ? classes.titleImportant : classes.title}
          >
            {title}
          </Typography>
        ) : null}
        {!expanded ? (
          <Fragment>
            {subTitle ? (
              <Typography variant="body2" className={classes.subTitle}>
                {subTitle}
              </Typography>
            ) : null}
            {subTitle2 ? <Typography variant="body2">{subTitle2}</Typography> : null}
          </Fragment>
        ) : null}
      </AccordionSummary>
      <AccordionDetails className={classes.details}>{children}</AccordionDetails>
    </Accordion>
  );
};

export default withStyles(styles)(ExpansionPaper as never) as unknown as React.ComponentType<Record<string, unknown>>;
