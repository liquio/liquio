import React, { useState } from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import { Button, Typography, IconButton, Tooltip } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import TextBlock from 'components/JsonSchema/elements/TextBlock';
import ProgressLine from 'components/Preloader/ProgressLine';
import { ReactComponent as Edit } from 'assets/img/ic_edit.svg';
import { ReactComponent as TrashIcon } from 'assets/img/ic_trash.svg';

const styles = (theme: Theme) => ({
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
    ...((theme as unknown as { popupWrapperStyles?: object }).popupWrapperStyles || {}),
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
    ...((theme as unknown as { popupTitle?: object })?.popupTitle || {}),
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
    ...((theme as unknown as { popupWrapperActions?: object }).popupWrapperActions || {}),
  },
  popupActionsWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'column' as const,
  },
  editBtn: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    ...((theme as unknown as { editBtn?: object }).editBtn || {}),
  },
  deleteBtn: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    ...((theme as unknown as { deleteBtn?: object }).deleteBtn || {}),
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

interface EditTooltipProps {
  t: (key: string) => string;
  open: boolean;
  setOpen: (open: boolean) => void;
  handleClickOpen: () => void;
  editText?: string;
  ariaText?: string;
}

const EditTooltip = ({ t, open = false, setOpen, handleClickOpen, editText, ariaText }: EditTooltipProps) => (
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

interface RenderValuesProps {
  htmlBlock?: string | null;
  params?: Record<string, unknown> | null;
  value?: Record<string, unknown>;
  rootDocument?: unknown;
  properties?: Record<string, unknown> | null;
  renderDataItem: (item: string, index: number) => React.ReactNode;
  useParentData?: boolean;
  classes: Record<string, string>;
}

const RenderValues = ({
  htmlBlock = null,
  params = null,
  value,
  rootDocument = null,
  properties = null,
  renderDataItem,
  useParentData = false,
  classes
}: RenderValuesProps) => {
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

interface WrapperProps extends WithStyles<typeof styles> {
  t: (key: string) => string;
  description?: string | null;
  handleClickOpen: () => void;
  renderDataItem: (item: string, index: number) => React.ReactNode;
  properties: Record<string, unknown>;
  htmlBlock?: string | null;
  params?: Record<string, unknown> | null;
  useOwnParams?: boolean;
  rootDocument: unknown;
  editTooltip?: boolean;
  value?: Record<string, unknown>;
  dynamicTitle?: boolean;
  useParentData?: boolean;
  style?: { wrapper?: string; header?: string; title?: string; editButton?: string } | null;
  popupDeleteArrayItem?: boolean;
  deleteItemAction: () => Promise<unknown>;
  handleClose: (disableSaveAction?: boolean) => void;
  editText?: string;
  readOnly?: boolean;
  openEmpty?: boolean;
  forceSaving?: boolean;
  deleteText?: string;
  avoidSpaceBetweenWithActionBtn?: boolean;
  withoutPaddingTopActinBtn?: boolean;
  ariaText?: string;
}

const Wrapper = ({
  t,
  classes,
  description = null,
  handleClickOpen,
  renderDataItem,
  properties,
  htmlBlock = null,
  params = null,
  useOwnParams = false,
  rootDocument,
  editTooltip = false,
  value = {},
  dynamicTitle = false,
  useParentData = false,
  style = null,
  popupDeleteArrayItem,
  deleteItemAction,
  handleClose,
  editText,
  readOnly = false,
  openEmpty,
  forceSaving = false,
  deleteText,
  avoidSpaceBetweenWithActionBtn = false,
  withoutPaddingTopActinBtn = false,
  ariaText
}: WrapperProps) => {
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
                <span className={(classes as Record<string, string>).fixTop}>
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

const translated = translate('Elements')(Wrapper as never);
const styled = withStyles(styles)(translated as never);
export default styled as unknown as React.ComponentType<Record<string, unknown>>;
