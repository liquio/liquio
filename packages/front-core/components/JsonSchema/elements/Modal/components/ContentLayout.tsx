import React from 'react';
import { translate, Translate } from 'react-translate';
import { Button, Typography } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import classNames from 'classnames';
import { Theme } from '@mui/material/styles';
import TextBlock from 'components/JsonSchema/elements/TextBlock';

const styles = (theme: Theme) => ({
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
    flexDirection: 'row-reverse' as const,
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

interface ContentLayoutProps extends WithStyles<typeof styles> {
  t: Translate;
  description?: string | null;
  handleClickOpen: () => void;
  actionText: string;
  sample?: string | null;
  htmlBlock?: string | null;
  buttonFloat?: string;
  isDisabled?: boolean;
  disabledText?: string | null;
  params?: Record<string, unknown> | null;
  rootDocument: unknown;
}

const ContentLayout = ({
  t,
  classes,
  description = null,
  handleClickOpen,
  actionText,
  sample = null,
  htmlBlock = null,
  buttonFloat = '',
  isDisabled = false,
  disabledText = null,
  params = null,
  rootDocument,
}: ContentLayoutProps) => (
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
        onClick={!isDisabled ? handleClickOpen : undefined}
        classes={{
          // MUI v5's ButtonClasses no longer has a `label` key (it existed in v4);
          // this silently no-ops today. Preserved as-is rather than removed.
          root: classes.actionButtonRoot,
          label: classes.actionButtonlabel,
        } as Record<string, string>}
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

const translated = translate('Elements')(ContentLayout);
const styled = withStyles(styles)(translated);
export default styled;
