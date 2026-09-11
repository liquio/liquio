import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {
  Button,
  CircularProgress,
  Divider,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import { validateData } from 'components/JsonSchema';
import Scrollbar from 'components/Scrollbar';
import DoubleArrowIcon from 'assets/img/arrow_forward_ios.svg';
import Copy from 'assets/img/copy.svg';
import WorkflowSettings from './WorkflowSettings';
import CreateParallelGatewayEnding from './CreateParallelGatewayEnding';
import ElementDetails from './Details';
import formElements from './Details/elements';
import awaitDelay from 'helpers/awaitDelay';
import schema from './WorkflowSettings/schema';
import unitSchema from './WorkflowSettings/unitSchema';

const useStyles = makeStyles((theme) => ({
  root: {
    width: 300,
    height: '100%',
    borderLeft: `1px solid ${theme.borderColor}`,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingTop: 8,
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  iconWrapper: {
    borderLeft: `1px solid ${theme.borderColor}`,
  },
  dropdownIcon: {
    width: 48,
    height: '100%',
    backgroundRepeat: 'no-repeat',
    backgroundImage: `url(${DoubleArrowIcon})`,
    backgroundPosition: '50% 50%',
    cursor: 'pointer',
    transition: '.2s ease-in-out',
    transform: 'rotate(180deg)',
  },
  iconRotate: {
    transform: 'rotate(0deg)',
  },
  body: {
    position: 'absolute',
    right: 0,
    top: 52,
    width: '100%',
    height: 'calc(100vh - 125px)',
    background: theme?.navigator?.sidebarBg,
    paddingTop: 20,
    transition: '.2s ease-in-out',
    opacity: 1,
    zIndex: 10,
  },
  bodyClosed: {
    transition: '.2s ease-in-out',
    top: '-100vh',
  },
  bodyToggled: {
    transition: '.2s ease-in-out',
    opacity: 0,
  },
  divider: {
    background: theme.borderColor,
    marginBottom: 15,
  },
  sidebarHeadline: {
    color: '#fff',
    display: 'flex',
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    '& > span': {
      fontWeight: 500,
      paddingRight: 15,
      textTransform: 'capitalize',
    },
  },
  copyButton: {
    display: 'flex',
    alignItems: 'center'
  },
  copyIcon: {
    marginLeft: 5,
  },
  copyElementButton: {
    color: theme?.navigator?.navItem?.linkActiveColor,
    marginTop: 11,
    marginBottom: 26,
    '& img': {
      marginRight: 11,
    },
    '&:hover': {
      backgroundColor: theme.buttonHoverBg,
    },
  },
  fillSvg: {
    fill: theme.textColorDark,
    color: theme.textColorDark,
    marginRight: 10,
  },
  pdr: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 20,
  },
}));

const getElementId = ({ businessObject: { id } }) =>
  parseInt(
    id.split('-').find((item) => Number(item)),
    10,
  );
const getElementType = ({ businessObject: { id } }) => id.split('-').shift();

const RightSidebar = ({
  t,
  handleSaveWorkflow,
  busy,
  saved,
  error,
  selection,
  workflow,
  workflowId,
  events,
  taskTemplates,
  workflowStatuses,
  numberTemplates,
  onChangeSettings,
  modeler,
  handleChangeElement,
  handleSave,
  savingElement,
  setBusy,
  blockHotkeysEvent,
  isPristine,
}) => {
  const [open, setOpen] = React.useState(true);
  const [mounted, setMounter] = React.useState(true);
  const [errors, setErrors] = React.useState([]);

  const classes = useStyles();

  const chosenElement = selection && formElements[selection.type];

  React.useEffect(() => {
    const listenChange = async () => {
      setMounter(false);
      await awaitDelay(300);
      setMounter(true);
    };

    listenChange();
  }, [selection]);

  const workflowSchema = schema({
    t,
    taskTemplates,
    events,
    workflowStatuses,
    numberTemplates,
  });

  const unitSettingsSchema = unitSchema({ t });

  const handleSaveAction = async () => {
    if (savingElement || busy) return;

    const errors = validateData(workflow, workflowSchema);

    if (errors.length) {
      setErrors(errors);
      return;
    }

    setErrors([]);

    await handleSave();

    handleSaveWorkflow();
  };

  const handleOpen = () => setOpen(!open);

  const activeType = chosenElement
    ? `${getElementType(selection)} Id`
    : 'Workflow Id';

  const activeId = chosenElement ? getElementId(selection) : workflowId;

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveAction}
          disabled={isPristine}
        >
          {busy || savingElement ? (
            <CircularProgress size={16} className={classes.fillSvg} />
          ) : null}

          {saved && error
            ? t('SavedWithError')
            : busy
              ? t('Saving')
              : t('Save')}
        </Button>

        <div className={classes.iconWrapper}>
          <div
            className={classNames({
              [classes.dropdownIcon]: true,
              [classes.iconRotate]: open,
            })}
            onClick={handleOpen}
          />
        </div>
      </div>

      <div
        className={classNames({
          [classes.body]: true,
          [classes.bodyClosed]: !open,
        })}
      >
        <Scrollbar options={{ suppressScrollX: true }}>
          <div
            className={classNames({
              [classes.pdr]: true,
              [classes.bodyToggled]: !mounted,
            })}
          >
            <Divider className={classes.divider} />

            <Typography className={classes.sidebarHeadline}>
              <span>{activeType}</span>
              <div
                className={classes.copyButton}
                onClick={() => navigator.clipboard.writeText(activeId)}
              >
                {activeId}
                <Tooltip title={t('Copy')}>
                  <IconButton className={classes.copyIcon} size="large">
                    <img src={Copy} alt={'copy'} />
                  </IconButton>
                </Tooltip>
              </div>
            </Typography>

            <CreateParallelGatewayEnding
              t={t}
              modeler={modeler}
              selection={selection}
              classes={classes}
            />

            <Divider className={classes.divider} />

            {chosenElement ? (
              <ElementDetails
                t={t}
                numberTemplates={numberTemplates}
                selectionId={selection?.businessObject?.id}
                selection={selection}
                workflow={workflow}
                modeler={modeler}
                onChange={handleChangeElement}
                handleSave={handleSave}
                busy={busy}
                savingElement={savingElement}
                setBusy={setBusy}
                blockHotkeysEvent={blockHotkeysEvent}
                classes={classes}
              />
            ) : (
              <WorkflowSettings
                t={t}
                busy={busy}
                errors={errors}
                setErrors={setErrors}
                workflow={workflow}
                handleChangeWorkflow={onChangeSettings}
                events={events}
                taskTemplates={taskTemplates}
                workflowStatuses={workflowStatuses}
                numberTemplates={numberTemplates}
                onChange={onChangeSettings}
                workflowSchema={workflowSchema}
                unitSettingsSchema={unitSettingsSchema}
                modeler={modeler}
                handleSave={handleSaveAction}
                isPristine={isPristine}
              />
            )}
          </div>
        </Scrollbar>
      </div>
    </div>
  );
};

RightSidebar.propTypes = {
  t: PropTypes.func.isRequired,
  handleSaveWorkflow: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
  saved: PropTypes.bool,
  error: PropTypes.object,
  selection: PropTypes.object,
  workflow: PropTypes.object.isRequired,
  workflowId: PropTypes.string.isRequired,
  events: PropTypes.array.isRequired,
  taskTemplates: PropTypes.array.isRequired,
  workflowStatuses: PropTypes.array.isRequired,
  numberTemplates: PropTypes.array.isRequired,
  onChangeSettings: PropTypes.func.isRequired,
  handleSave: PropTypes.func.isRequired,
  isPristine: PropTypes.bool,
};

RightSidebar.defaultProps = {
  saved: false,
  error: null,
  selection: null,
  isPristine: false,
};

export default RightSidebar;
