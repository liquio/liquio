import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Accordion, AccordionSummary, Typography, AccordionDetails } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const styles = (theme) => ({
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
      outline: '3px solid #0073E6',
      outlineOffset: '2px'
    }
  },
  details: {
    display: 'block',
    padding: 0
  },
  colorPrimary: {
    color: '#000'
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

const ExpansionPaper = ({
  classes,
  title,
  subTitle,
  subTitle2,
  children,
  titleImportant,
  defaultExpanded
}) => {
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
            variant="stepsTitle"
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

ExpansionPaper.propTypes = {
  classes: PropTypes.object.isRequired,
  title: PropTypes.string,
  subTitle: PropTypes.string,
  subTitle2: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
  titleImportant: PropTypes.bool,
  defaultExpanded: PropTypes.bool
};

ExpansionPaper.defaultProps = {
  title: '',
  subTitle: '',
  subTitle2: '',
  titleImportant: false,
  defaultExpanded: false
};

export default withStyles(styles)(ExpansionPaper);
