import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { Button, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import classNames from 'classnames';
import TextBlock from 'components/JsonSchema/elements/TextBlock';

const styles = (theme) => ({
  blockWrapper: {
    border: '2px solid #000',
    maxWidth: 640,
    padding: 30,
    [theme.breakpoints.down('md')]: {
      padding: 16,
      marginTop: 15,
    },
  },
  title: {
    marginBottom: 15,
    [theme.breakpoints.down('md')]: {
      fontSize: 16,
    },
  },
  alignWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alignLeft: {
    flexDirection: 'row-reverse',
  },
  actionButtonRoot: {
    [theme.breakpoints.down('md')]: {
      marginRight: 0,
    },
  },
  actionButtonlabel: {
    padding: '15px 35px!important',
  },
});

const ContentLayout = ({
  t,
  classes,
  description,
  handleClickOpen,
  actionText,
  sample,
  htmlBlock,
  buttonFloat,
  isDisabled,
  disabledText,
  params,
  rootDocument,
}) => (
  <div className={classes.blockWrapper}>
    {description && (
      <Typography variant={'subtitle1'} className={classes.title}>
        {description}
      </Typography>
    )}
    {sample && <Typography style={{ marginBottom: 25 }}>{sample}</Typography>}
    <div
      className={classNames(
        (buttonFloat === 'right' || buttonFloat === 'left') &&
          classes.alignWrapper,
        buttonFloat === 'left' && classes.alignLeft,
      )}
    >
      {htmlBlock ? (
        <TextBlock
          htmlBlock={htmlBlock}
          params={params}
          rootDocument={rootDocument}
        />
      ) : null}
      <Button
        color="primary"
        variant="contained"
        onClick={!isDisabled ? handleClickOpen : null}
        classes={{
          root: classes.actionButtonRoot,
          label: classes.actionButtonlabel,
        }}
        disabled={isDisabled}
        aria-label={actionText || t('Open')}
      >
        {isDisabled ? (
          <>
            <CheckRoundedIcon style={{ marginRight: 10 }} />
            {disabledText || actionText || t('Open')}
          </>
        ) : (
          actionText || t('Open')
        )}
      </Button>
    </div>
  </div>
);

ContentLayout.propTypes = {
  t: PropTypes.func.isRequired,
  actionText: PropTypes.string.isRequired,
  htmlBlock: PropTypes.string,
  classes: PropTypes.object.isRequired,
  handleClickOpen: PropTypes.func.isRequired,
  description: PropTypes.string,
  sample: PropTypes.string,
  buttonFloat: PropTypes.string,
  disabledText: PropTypes.string,
  isDisabled: PropTypes.bool,
  rootDocument: PropTypes.object.isRequired,
  params: PropTypes.object,
};

ContentLayout.defaultProps = {
  description: null,
  htmlBlock: null,
  sample: null,
  buttonFloat: '',
  disabledText: null,
  isDisabled: false,
  params: null,
};

const translated = translate('Elements')(ContentLayout);
const styled = withStyles(styles)(translated);
export default styled;
