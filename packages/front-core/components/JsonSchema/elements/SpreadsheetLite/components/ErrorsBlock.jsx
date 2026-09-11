import React from 'react';
import classNames from 'classnames';
import { useTranslate } from 'react-translate';
import makeStyles from '@mui/styles/makeStyles';
import ErrorIcon from '@mui/icons-material/Error';
import { ReactComponent as ErrorArrowDownIcon } from 'assets/img/errorArrowDownIcon.svg';
import { ReactComponent as ErrorInlineIcon } from 'assets/img/errorInlineIcon.svg';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import theme from 'theme';

const styles = (theme) => ({
  errorWrapper: {
    backgroundColor: 'rgba(202, 0, 0, 0.1)',
    borderRadius: 5,
    marginBottom: 10,
    maxWidth: 828,
  },
  errorText: {
    fontSize: 13,
    lineHeight: '18px',
    color: '#BA0009',
  },
  errorTitle: {
    fontSize: 16,
    lineHeight: '24px',
    marginBottom: 8,
    textDecoration: 'underline',
    textTransform: 'capitalize',
  },
  errorIcon: {
    color: '#BA0009',
  },
  borderBottom: {
    cursor: 'pointer',
    '& span': {
      fontSize: 13,
      lineHeight: '18px',
      borderBottom: '1px solid rgba(0, 0, 0, 1)',
    },
  },
  listItemRoot: {
    alignItems: 'start',
  },
  listItemTextRoot: {
    margin: 0,
  },
  listTitle: {
    fontSize: '28px',
    lineHeight: '32px',
    marginBottom: '24px',
    [theme.breakpoints.down('sm')]: {
      fontSize: '18px',
      lineHeight: '24px',
    },
  },
  errorBlock: {
    padding: 0,
    '&:not(:last-child)': {
      marginBottom: '16px',
    },
  },
  defaultList: {
    backgroundColor: 'inherit',
    borderRadius: 'inherit',
    border: '2px solid #BA0009',
    padding: '24px',
  },
  moreTextWrap: {
    display: 'flex',
    marginTop: 16,
  },
  noMargin: {
    '&:not(:last-child)': {
      marginBottom: 0,
    },
  },
  listItemIcon: {
    minWidth: 32,
  },
  opened: {
    transform: 'rotate(180deg)',
  },
});

const useStyles = makeStyles(styles);
const { defaultLayout } = theme;
const ERRORS_LIMIT = 3;
const PROPERTY_POSITION = 1;
const MAX_LENGTH_ERROR = 'should NOT be longer';

const ErrorsBlock = ({ errors, name, items: { properties } }) => {
  const [open, setOpen] = React.useState(false);
  const t = useTranslate('Elements');
  const classes = useStyles();

  if (!errors || !Array.isArray(errors) || !errors.length) {
    return null;
  }

  const toggleErrorList = () => setOpen(!open);

  const RenderListItem = ({ error }) => {
    const { path, rowId, errorText, message } = error;

    const pathArray = path.split('.');

    const propertyData = pathArray[pathArray.length - PROPERTY_POSITION];

    const property = properties[propertyData]?.description || propertyData;

    const customError =
      error?.keyword === 'required' && !errorText && !message
        ? t('RequiredField')
        : null;

    const isNaN = Number.isNaN(Number(rowId));

    let errorMessage = errorText || message || customError;

    if ((errorMessage || '').includes(MAX_LENGTH_ERROR)) {
      const maxLength = (errorMessage || '').match(/\d+/)[0];
      if (maxLength) {
        errorMessage = t('MaxLengthError', { length: maxLength });
      }
    }

    return (
      <ListItem
        className={classNames({
          [classes.error]: true,
          [classes.errorBlock]: true,
          [classes.defaultListItem]: defaultLayout,
        })}
        classes={{
          root: classes.listItemRoot,
        }}
      >
        <ListItemIcon className={classes.listItemIcon}>
          {defaultLayout ? (
            <ErrorInlineIcon />
          ) : (
            <ErrorIcon className={classes.errorIcon} />
          )}
        </ListItemIcon>

        <ListItemText
          classes={{
            root: classes.listItemTextRoot,
          }}
          primary={
            <>
              <Typography
                className={classNames(classes.errorText, classes.errorTitle)}
              >
                {typeof rowId === 'number' && !isNaN ? (
                  <>
                    {t('Line', { line: (rowId || 0) + 1 })}
                    {!['0', name].includes(property) ? (
                      <>
                        {', '}
                        {t('Column', { column: property })}
                      </>
                    ) : null}
                  </>
                ) : null}
              </Typography>
              <Typography className={classes.errorText}>
                {errorMessage}
              </Typography>
            </>
          }
        />
      </ListItem>
    );
  };

  return (
    <List
      className={classNames({
        [classes.errorWrapper]: true,
        [classes.defaultList]: defaultLayout,
      })}
    >
      {defaultLayout ? (
        <ListItem
          className={classNames(
            classes.error,
            classes.errorBlock,
            classes.noMargin,
          )}
        >
          <Typography variant="h3" className={classes.listTitle}>
            {t('ErrorListTitle')}
          </Typography>
        </ListItem>
      ) : null}

      {errors
        .filter((_, index) => index < ERRORS_LIMIT)
        .map((error, index) => (
          <RenderListItem key={index} error={error} />
        ))}

      {errors.length > ERRORS_LIMIT ? (
        <>
          {open ? (
            <>
              {errors
                .filter((_, index) => index >= ERRORS_LIMIT)
                .map((error, index) => (
                  <RenderListItem key={index} error={error} />
                ))}
            </>
          ) : null}
          <ListItem className={classNames(classes.error, classes.errorBlock)}>
            {defaultLayout ? null : <ListItemIcon />}

            <ListItemText
              primary={
                <div className={classes.moreTextWrap}>
                  {defaultLayout ? (
                    <ErrorArrowDownIcon
                      className={open ? classes.opened : null}
                    />
                  ) : null}
                  <Typography
                    className={classes.borderBottom}
                    onClick={toggleErrorList}
                  >
                    <span>
                      {t(open ? 'HideLastErrors' : 'ShowLastErrors', {
                        count: errors.length - ERRORS_LIMIT,
                      })}
                    </span>
                  </Typography>
                </div>
              }
            />
          </ListItem>
        </>
      ) : null}
    </List>
  );
};

export default ErrorsBlock;
