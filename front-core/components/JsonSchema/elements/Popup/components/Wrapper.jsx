import React, { useState } from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import { Button, Typography, IconButton, Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import PropTypes from 'prop-types';
import TextBlock from 'components/JsonSchema/elements/TextBlock';
import ProgressLine from 'components/Preloader/ProgressLine';
import { ReactComponent as Edit } from 'assets/img/ic_edit.svg';
import { ReactComponent as TrashIcon } from 'assets/img/ic_trash.svg';

const styles = (theme) => ({
  blockWrapper: {
    border: '2px solid #000',
    maxWidth: 640,
    padding: 30,
    [theme.breakpoints.down('lg')]: {
      padding: 16,
    },
    [theme.breakpoints.down('md')]: {
      marginTop: 15,
    },
    ...(theme.popupWrapperStyles || {}),
  },
  withoutPaddingTopActinBtn: {
    '& > div > div:last-child': {
      [theme.breakpoints.down('md')]: {
        paddingTop: 8
      },
      '& > span': {
        [theme.breakpoints.down('md')]: {
          paddingTop: 0
        }
      }
    },
  },
  blockHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    [theme.breakpoints.down('lg')]: {
      alignItems: 'end',
    },
    [theme.breakpoints.down('sm')]: {
      alignItems: 'center',
    },
  },
  values: {
    marginTop: 15,
  },
  removeMargin: {
    margin: 0,
    marginTop: -5,
  },
  editButton: {
    '&>span': {
      fontSize: 13,
    },
    [theme.breakpoints.down('lg')]: {
      justifyContent: 'flex-end',
      padding: 0,
    },
  },
  editText: {
    [theme.breakpoints.down('lg')]: {
      display: 'none',
    },
  },
  title: {
    marginRight: 15,
    padding: 3,
    fontSize: 20,
    [theme.breakpoints.down('lg')]: {
      fontSize: 16,
    },
    ...(theme?.popupTitle || {}),
  },
  flex: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  avoidSpaceBetween: {
    justifyContent: 'flex-start',
  },
  dynamicTitleButton: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  withoutPadding: {
    padding: '0 8px',
    minWidth: 125,
    justifyContent: 'start',
    marginBottom: 5,
    [theme.breakpoints.down('lg')]: {
      minWidth: 73,
    },
    ...(theme.popupWrapperActions || {}),
  },
  popupActionsWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'column',
  },
  editBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    ...(theme.editBtn || {}),
  },
  deleteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    ...(theme.deleteBtn || {}),
  },
  wrap: {
    width: 'calc(100% - 40px)',
  },
  isEllipsis: {
    '& .ellipsis': {
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    },
  }
});

const EditTooltip = ({ t, open, setOpen, handleClickOpen, editText, ariaText }) => (
  <Tooltip title={editText || t('Edit')} open={open}>
    <IconButton
      onMouseOver={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(false)}
      onClick={handleClickOpen}
      aria-label={ariaText || editText || t('Edit')}
      sx={{
        '&:focus-visible': {
          outline: '3px solid #0073E6',
          outlineOffset: '2px',
        }
      }}
    >
      <Edit />
    </IconButton>
  </Tooltip>
);

EditTooltip.propTypes = {
  t: PropTypes.func.isRequired,
  handleClickOpen: PropTypes.func.isRequired,
  setOpen: PropTypes.func.isRequired,
  open: PropTypes.object,
};

EditTooltip.defaultProps = {
  open: false,
};

const RenderValues = ({
  htmlBlock,
  params,
  value,
  rootDocument,
  properties,
  renderDataItem,
  useParentData,
  classes
}) => {
  const [ellipsisState, setEllipsisState] = useState(true);
  return (
    <div
className={classNames({
      [classes.wrap]: true,
      [classes.isEllipsis]: ellipsisState,
    })} onClick={() => setEllipsisState(!ellipsisState)}
    >
      {htmlBlock ? (
        <TextBlock
          htmlBlock={htmlBlock}
          params={params}
          parentValue={value}
          rootDocument={rootDocument}
          useParentData={useParentData}
          noMargin={true}
        />
      ) : (
        Object.keys(properties || {}).map((item, index) =>
          renderDataItem(item, index),
        )
      )}
    </div>
  )
};

RenderValues.propTypes = {
  renderDataItem: PropTypes.func.isRequired,
  htmlBlock: PropTypes.string,
  params: PropTypes.object,
  rootDocument: PropTypes.object,
  properties: PropTypes.object,
  useParentData: PropTypes.bool,
};

RenderValues.defaultProps = {
  htmlBlock: null,
  params: null,
  rootDocument: null,
  properties: null,
  useParentData: false,
};

const Wrapper = ({
  t,
  classes,
  description,
  handleClickOpen,
  renderDataItem,
  properties,
  htmlBlock,
  params,
  useOwnParams,
  rootDocument,
  editTooltip,
  value,
  dynamicTitle,
  useParentData,
  style,
  popupDeleteArrayItem,
  deleteItemAction,
  handleClose,
  editText,
  readOnly,
  openEmpty,
  forceSaving,
  deleteText,
  avoidSpaceBetweenWithActionBtn,
  withoutPaddingTopActinBtn,
  ariaText
}) => {
  const [open, setOpen] = useState(false);
  const [deleting, toggleDeleting] = useState(false);

  const handleDelete = async () => {
    toggleDeleting(true);

    await deleteItemAction();

    handleClose(true);

    toggleDeleting(false);
  };

  if (deleting) return <ProgressLine loading={true} />;

  if (openEmpty && forceSaving && Object.keys(value || {}).length === 0)
    return null;

  return (
    <div className={classNames(
      classes.blockWrapper,
      style && style.wrapper,
      withoutPaddingTopActinBtn && classes.withoutPaddingTopActinBtn
    )}
    >
      {description ? (
        <div className={classNames(classes.blockHead, style && style.header)}>
          <Typography
            tabIndex={0}
            variant={'h3'}
            className={classNames(classes.title, style && style.title)}
          >
            {description}
          </Typography>

          {readOnly ? null : (
            <>
              {editTooltip ? (
                <EditTooltip
                  t={t}
                  open={open}
                  setOpen={setOpen}
                  handleClickOpen={handleClickOpen}
                  editText={editText}
                />
              ) : (
                <Button
                  onClick={handleClickOpen}
                  className={classNames(
                    classes.editButton,
                    classes.withoutPadding,
                    style && style.editButton,
                  )}
                  startIcon={<Edit />}
                  aria-label={editText || t('Edit')}
                >
                  <span className={classes.editText}>
                    {editText || t('Edit')}
                  </span>
                </Button>
              )}
            </>
          )}
        </div>
      ) : null}

      <div
        className={classNames(
          classes.values,
          !description && classes.flex,
          !description && classes.removeMargin,
          dynamicTitle && classes.dynamicTitleButton,
          avoidSpaceBetweenWithActionBtn && classes.avoidSpaceBetween,
        )}
      >
        <RenderValues
          htmlBlock={htmlBlock}
          params={params}
          value={value}
          rootDocument={useOwnParams ? value : rootDocument}
          properties={properties}
          renderDataItem={renderDataItem}
          useParentData={useParentData}
          classes={classes}
        />

        <div className={classes.popupActionsWrapper}>
          {!description && !dynamicTitle && !readOnly ? (
            <>
              {editText ? (
                <Button
                  onClick={handleClickOpen}
                  className={classes.editBtn}
                  startIcon={<Edit />}
                  aria-label={editText}
                >
                  {editText}
                </Button>
              ) : (
                <span className={classes.fixTop}>
                  <EditTooltip
                    t={t}
                    open={open}
                    setOpen={setOpen}
                    handleClickOpen={handleClickOpen}
                    editText={editText}
                    ariaText={ariaText}
                  />
                </span>
              )}
            </>
          ) : null}

          {dynamicTitle && !description && !readOnly ? (
            <>
              {editText ? (
                <Button
                  onClick={handleClickOpen}
                  className={classes.editBtn}
                  startIcon={<Edit />}
                  aria-label={editText}
                >
                  {editText}
                </Button>
              ) : (
                <EditTooltip
                  t={t}
                  open={open}
                  setOpen={setOpen}
                  handleClickOpen={handleClickOpen}
                  editText={editText}
                />
              )}
            </>
          ) : null}

          {popupDeleteArrayItem && !readOnly ? (
            <>
              {deleteText ? (
                <Button
                  onClick={handleDelete}
                  className={classes.deleteBtn}
                  startIcon={<TrashIcon />}
                  aria-label={deleteText}
                >
                  {deleteText}
                </Button>
              ) : (
                <Tooltip title={t('Delete')}>
                  <IconButton
                    onClick={handleDelete}
                    size="large"
                    aria-label={t('Delete')}
                  >
                    <TrashIcon />
                  </IconButton>
                </Tooltip>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

Wrapper.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  handleClickOpen: PropTypes.func.isRequired,
  renderDataItem: PropTypes.func.isRequired,
  properties: PropTypes.object.isRequired,
  rootDocument: PropTypes.object.isRequired,
  description: PropTypes.string,
  htmlBlock: PropTypes.string,
  params: PropTypes.object,
  editTooltip: PropTypes.bool,
  useOwnParams: PropTypes.bool,
  value: PropTypes.object,
  dynamicTitle: PropTypes.bool,
  style: PropTypes.object,
  useParentData: PropTypes.bool,
  readOnly: PropTypes.bool,
  forceSaving: PropTypes.bool,
  avoidSpaceBetweenWithActionBtn: PropTypes.bool,
  withoutPaddingTopActinBtn: PropTypes.bool,
};

Wrapper.defaultProps = {
  value: {},
  editTooltip: false,
  dynamicTitle: false,
  useOwnParams: false,
  description: null,
  htmlBlock: null,
  params: null,
  style: null,
  useParentData: false,
  readOnly: false,
  forceSaving: false,
  avoidSpaceBetweenWithActionBtn: false,
  withoutPaddingTopActinBtn: false,
};

const translated = translate('Elements')(Wrapper);
const styled = withStyles(styles)(translated);
export default styled;
