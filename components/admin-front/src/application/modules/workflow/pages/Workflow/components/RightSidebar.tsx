import React from 'react';
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
import { Theme } from '@mui/material/styles';
import { validateData } from 'components/JsonSchema';
import ScrollbarRaw from 'components/Scrollbar';
import DoubleArrowIcon from 'assets/img/arrow_forward_ios.svg';
import Copy from 'assets/img/copy.svg';
import WorkflowSettingsRaw from './WorkflowSettings';
import CreateParallelGatewayEnding from './CreateParallelGatewayEnding';
import ElementDetailsRaw from './Details';
import formElementsRaw from './Details/elements';
import awaitDelay from 'helpers/awaitDelay';
import schema from './WorkflowSettings/schema';
import unitSchema from './WorkflowSettings/unitSchema';

const Scrollbar = ScrollbarRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface BpmnElementLike {
  type: string;
  businessObject: { id: string };
  [key: string]: unknown;
}

const useStyles = makeStyles((theme: Theme & {
  navigator?: { sidebarBg?: string; navItem?: { linkActiveColor?: string } };
  borderColor?: string;
  buttonHoverBg?: string;
  textColorDark?: string;
}) => ({
  root: {
    width: 300,
    height: '100%',
    borderLeft: `1px solid ${theme.borderColor}`,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingTop: 8,
    position: 'relative' as const,
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
    position: 'absolute' as const,
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
      textTransform: 'capitalize' as const,
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

const getElementId = ({ businessObject: { id } }: BpmnElementLike) =>
  parseInt(
    id.split('-').find((item) => Number(item)) as string,
    10,
  );
const getElementType = ({ businessObject: { id } }: BpmnElementLike) => id.split('-').shift();

interface RightSidebarProps {
  t: (key: string) => string;
  handleSaveWorkflow: () => void;
  busy: boolean;
  saved?: boolean;
  error?: Error | null;
  selection?: BpmnElementLike | null;
  workflow: Record<string, unknown>;
  workflowId: string;
  events: unknown[];
  taskTemplates: unknown[];
  workflowStatuses: unknown[];
  numberTemplates: unknown[];
  onChangeSettings: (...args: unknown[]) => void;
  modeler?: BpmnJsInstance;
  handleChangeElement: (...args: unknown[]) => void;
  handleSave: () => Promise<void>;
  savingElement?: boolean;
  setBusy: (busy: boolean) => void;
  blockHotkeysEvent?: (...args: unknown[]) => void;
  isPristine?: boolean;
}

const RightSidebar = ({
  t,
  handleSaveWorkflow,
  busy,
  saved = false,
  error = null,
  selection = null,
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
  isPristine = false,
}: RightSidebarProps) => {
  const [open, setOpen] = React.useState(true);
  const [mounted, setMounter] = React.useState(true);
  const [errors, setErrors] = React.useState<unknown[]>([]);

  const classes = useStyles();

  const formElements = formElementsRaw as unknown as Record<string, unknown>;
  const ElementDetails = ElementDetailsRaw as unknown as React.ComponentType<Record<string, unknown>>;
  const WorkflowSettings = WorkflowSettingsRaw as unknown as React.ComponentType<Record<string, unknown>>;

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
  } as never);

  const unitSettingsSchema = unitSchema({ t } as never);

  const handleSaveAction = async () => {
    if (savingElement || busy) return;

    const errors = validateData(workflow, workflowSchema as never);

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
    ? `${getElementType(selection as BpmnElementLike)} Id`
    : 'Workflow Id';

  const activeId = chosenElement ? getElementId(selection as BpmnElementLike) : workflowId;

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
                onClick={() => navigator.clipboard.writeText(activeId as unknown as string)}
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
              selection={selection as never}
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

export default RightSidebar;
