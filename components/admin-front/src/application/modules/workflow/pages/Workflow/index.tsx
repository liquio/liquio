import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
import queue from 'queue';
import diff from 'helpers/diff';
import moment from 'moment';
import objectPath from 'object-path';
import hotkeys from 'hotkeys-js';
import classNames from 'classnames';
import cleanDeep from 'clean-deep';
import jwtDecode from 'jwt-decode';
import { Link } from 'react-router-dom';
import LeftSidebarLayoutRaw, { DrawerContent } from 'layouts/LeftSidebar';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  DialogTitle,
  DialogContentText,
  AppBar,
  Toolbar,
  IconButton,
  Tooltip
} from '@mui/material';

import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFileOutlined';
import DoneIcon from '@mui/icons-material/Done';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import CreateIcon from '@mui/icons-material/Create';

import {
  requestWorkflow,
  onElementChange,
  onElementSelect,
  changeWorkflowData,
  storeWorkflowData,
  requestWorkflowStatuses,
  handleCopyElement
} from 'application/actions/workflow';

import { requestNumberTemplates } from 'application/actions/numberTemplates';

import { changeTaskData, saveTaskData, deleteTask, requestTask } from 'application/actions/tasks';
import {
  changeGatewayData,
  saveGatewayData,
  deleteGateway,
  requestGateway,
  getGatewayTypes
} from 'application/actions/gateways';
import {
  saveEventData,
  deleteEvent,
  changeEventData,
  requestEvent
} from 'application/actions/events';

import { addError, closeError, addMessage } from 'actions/error';
import { addFavorites, deleteFavorites, getFavoritesById } from 'actions/favorites';

import gatewayElementTypes from 'application/modules/workflow/variables/gatewayElementTypes';
import eventElementTypes from 'application/modules/workflow/variables/eventElementTypes';
import taskElementTypes from 'application/modules/workflow/variables/taskElementTypes';

import StringElementRaw from 'components/JsonSchema/elements/StringElement';
import PreloaderRaw from 'components/Preloader';
import ModulePage, { type ModulePageProps } from 'components/ModulePage';
import { BPMNEditor as BPMNEditorRaw } from 'components/BpmnSchema';
import Message from 'components/Snackbars/Message';

import waiter from 'helpers/waitForAction';
import minUnusedIndex from 'helpers/minUnusedIndex';
import padWithZeroes from 'helpers/padWithZeroes';
import RenderOneLineRaw from 'helpers/renderOneLine';
import storage from 'helpers/storage';

import ListIcon from 'assets/img/logs_icon.svg';
import propsToData from './helpers/propsToData';
import elementsByType from './helpers/elementsByType';
import normalizeElementId from './helpers/normalizeElementId';
import elementToMenuItem from './helpers/elementToMenuItem';

import WorkflowVersionsRaw from './components/WorkflowVersions';
import RightSidebarRaw from './components/RightSidebar';

import { elementCreate as elementCreateRaw, elementDelete, elementChange as elementChangeRaw } from './handlers';
import { getConfig } from 'core/helpers/configLoader';

// `elementCreate`/`elementChange` are literal no-op stubs (`() => () => {}`,
// see handlers/elementCreate.ts and elementChange.ts) — their real type takes
// no arguments, but every call site here calls them the same
// `handler(modeler)(element)` shape as the real `elementDelete`, matching
// the original untyped JS (which silently ignored the extra args). Cast
// once here rather than at each call site.
const elementCreate = elementCreateRaw as unknown as (modeler: unknown) => (element: unknown) => void;
const elementChange = elementChangeRaw as unknown as (modeler: unknown) => (element: unknown) => void;

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;
const WorkflowVersions = WorkflowVersionsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const RightSidebar = RightSidebarRaw as unknown as React.ComponentType<Record<string, unknown>>;
const BPMNEditor = BPMNEditorRaw as unknown as React.ComponentType<Record<string, unknown>>;

const DELETE_INTERVAL = 100;
const REQUEST_ELEMENTS_INTERVAL = 100;

type AppTheme = Theme & {
  navigator: { navItem: { linkActiveColor?: string }; sidebarBg?: string };
  buttonHoverBg?: string;
  buttonBg?: string;
};

const styles = (theme: AppTheme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%'
  },
  saved: {
    display: 'flex',
    alignItems: 'center',
    color: 'green',
    borderColor: 'green',
    fontWeight: 900,
    '& > *': {
      marginRight: 4
    }
  },
  withError: {
    color: 'red'
  },
  toolbar: {
    paddingLeft: 12,
    '& > *': {
      marginRight: 10
    },
    '& > :last-child': {
      marginRight: 0
    }
  },
  saveButtonIcon: {
    marginRight: 5
  },
  historyText: {
    color: '#fff',
    display: 'flex',
    alignItems: 'center'
  },
  pasteElementButton: {
    fill: theme.navigator.navItem.linkActiveColor
  },
  iconWrapper: {
    marginLeft: 15,
    '&:hover': {
      backgroundColor: theme.buttonHoverBg
    }
  },
  changeNameWrapper: {
    display: 'flex',
    alignItems: 'center',
    width: '100%'
  },
  dialogTitle: {
    paddingBottom: 0,
    paddingTop: 30,
    '& h2': {
      fontWeight: 400,
      fontSize: 32,
      lineHeight: '38px',
      letterSpacing: '-0.02em',
      color: '#FFFFFF'
    }
  },
  dialogPaper: {
    background: theme.navigator.sidebarBg
  },
  dialogActionsRoot: {
    padding: '0 24px',
    paddingBottom: 25
  },
  dialogTextRoot: {
    color: '#fff'
  },
  listItemRoot: {
    color: '#fff'
  },
  listItemSelected: {
    backgroundColor: `${theme.buttonHoverBg}!important`
  },
  iconFilled: {
    fill: theme.buttonBg
  }
});

interface WorkflowData {
  id?: string | number;
  name?: string;
  description?: string;
  workflowTemplateCategoryId?: string | number;
  xmlBpmnSchema?: string;
  tags?: unknown[];
  lastWorkflowHistory?: { id?: string | number; version?: string };
  [key: string]: unknown;
}

interface BpmnElementLike {
  id: string;
  type: string;
  businessObject: { id: string; [key: string]: unknown };
  [key: string]: unknown;
}

interface EntityStorage {
  actual: Record<string, unknown>;
  origin: Record<string, unknown>;
  types?: { id: string | number; name: string }[];
}

const getUnsaved = ({ actual, origin }: EntityStorage, ids: number[]) =>
  Object.keys(actual)
    .map((itemId) => parseInt(itemId, 10))
    .filter((itemId) => ids.includes(itemId))
    .filter((itemId) => JSON.stringify(actual[itemId]) !== JSON.stringify(origin[itemId]));

interface WorkflowPageProps extends ModulePageProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  actions: {
    onElementSelect: (event: unknown) => void;
    onElementChange: (event: unknown) => void;
    addError: (error: Error) => void;
    closeError: (index?: number) => void;
    addMessage: (message: unknown) => void;
    getFavoritesById: (params: { entity: string; id: string | number }) => Promise<unknown>;
    requestNumberTemplates: (options: Record<string, unknown>) => Promise<unknown>;
    requestWorkflowStatuses: () => Promise<unknown>;
    requestWorkflow: (workflowId: string | number) => Promise<WorkflowData | Error>;
    changeWorkflowData: (workflowId: string | number, data: unknown) => void;
    storeWorkflowData: (workflowId: string | number, data: unknown) => Promise<unknown>;
    changeEventData: (eventId: string | number, data: unknown) => void;
    changeTaskData: (taskId: string | number, data: unknown) => void;
    changeGatewayData: (gatewayId: string | number, data: unknown) => void;
    handleCopyElement: (payload: unknown) => void;
    saveEventData: (data: unknown) => Promise<unknown>;
    saveTaskData: (data: unknown) => Promise<unknown>;
    saveGatewayData: (data: unknown) => Promise<unknown>;
    deleteTask: (id: string | number) => Promise<unknown>;
    deleteEvent: (id: string | number) => Promise<unknown>;
    deleteGateway: (id: string | number) => Promise<unknown>;
    requestTask: (id: string | number) => Promise<unknown>;
    requestEvent: (id: string | number) => Promise<unknown>;
    requestGateway: (id: string | number) => Promise<unknown>;
    getGatewayTypes: () => Promise<unknown>;
    deleteFavorites: (params: { entity: string; id: string | number }) => Promise<unknown>;
    addFavorites: (params: { entity: string; id: string | number }) => Promise<unknown>;
  };
  match: { params: { workflowId: string; selectionId?: string } };
  location: unknown;
  loading?: boolean;
  selection?: BpmnElementLike | null;
  copiedElement?: { elementId: string; elementType: string; data: unknown } | null;
  events: EntityStorage & { types?: { id: string | number; name: string }[] };
  gateways: EntityStorage;
  tasks: EntityStorage;
  numberTemplates?: unknown[];
  workflowStatuses?: unknown[];
  actualWorkflowList: Record<string, unknown>;
  originWorkflowList: Record<string, unknown>;
}

interface WorkflowPageState {
  error: Error | null;
  busy: boolean;
  inited: boolean;
  blockHotkeys: boolean;
  askEventType: boolean;
  changingName: boolean;
  isFavorite: boolean;
  newName: string;
  saved?: boolean;
  savingElement?: boolean;
}

class WorkflowPage extends ModulePage<WorkflowPageProps> {
  config: Record<string, unknown>;
  interval: ReturnType<typeof setInterval> | null = null;
  timeout?: ReturnType<typeof setTimeout>;
  delQueue: ReturnType<typeof queue>;
  queue: ReturnType<typeof queue>;
  modeler?: BpmnJsInstance;
  workflowDisabled: boolean;

  state: WorkflowPageState = {
    error: null,
    busy: false,
    inited: false,
    blockHotkeys: false,
    askEventType: false,
    changingName: false,
    isFavorite: false,
    newName: ''
  };

  constructor(props: WorkflowPageProps) {
    super(props);
    const { actions } = props;

    this.config = getConfig() as unknown as Record<string, unknown>;

    const onFinishSave = () => {
      this.setState({
        busy: false,
        savingElement: false,
        saved: true
      });

      setTimeout(
        () =>
          this.setState({
            saved: false,
            error: null
          }),
        2000
      );
    };

    const onStartSave = () => {
      this.setState({
        busy: true,
        saved: false
      });
    };

    this.delQueue = queue({ autostart: false });
    this.queue = queue({ autostart: true, concurrency: 1 });

    this.delQueue.on('start', onStartSave);

    this.delQueue.on('end', onFinishSave);

    this.queue.on('end', () => {
      // `queue`'s shipped .d.ts omits its own `.jobs` array property, even
      // though the real source assigns/reads `this.jobs` throughout (same
      // gap documented in an earlier batch's ExportReport.tsx).
      if ((this.delQueue as unknown as { jobs: unknown[] }).jobs.length) {
        this.delQueue.start();
      } else {
        onFinishSave();
      }
    });

    this.queue.on('success', (result: unknown) => {
      if (result instanceof Error) {
        if (result.message === 'Header Last-Workflow-History-Id expired.') {
          const error = new Error('WorkflowOldVersionError') as Error & { details?: React.ReactNode };

          const { details } = (result as { response?: { details?: { lastWorkflowHistory?: unknown }[] } }).response || {};

          if (details) {
            const { lastWorkflowHistory } = details.pop() as { lastWorkflowHistory?: unknown };

            if (!lastWorkflowHistory) return;

            error.details = this.lastEditString(lastWorkflowHistory as WorkflowData['lastWorkflowHistory']);
          }
          actions.addError(error);
        } else {
          const error = new Error('ErrorSavingWorkflow') as Error & { details?: unknown };
          const errorResult = result as { response?: { errors?: unknown }; message?: string };
          error.details = (errorResult.response && errorResult.response.errors) || errorResult.message;
          actions.addError(error);
        }
        this.setState({ error: result as Error });
      }
    });

    const { workflowDisabled } = this.config as { workflowDisabled?: boolean };
    this.workflowDisabled = workflowDisabled || false;
  }

  componentDidMount = () => {
    this.init(this.props);
    hotkeys('ctrl+v, command+v', this.handlePasteCopiedElement as never);
    this.listenTokenExpired();
  };

  componentDidUpdate = (prevProps?: WorkflowPageProps) => {
    const { match: { params: { workflowId } } } = prevProps as WorkflowPageProps;
    super.componentDidUpdate();

    const { actions } = this.props;

    if (workflowId !== this.props.match.params.workflowId) {
      this.init(this.props);
      actions.onElementSelect(null);
    }
  };

  componentWillUnmount = () => {
    const { actions } = this.props;
    actions.onElementSelect(null);
    hotkeys.unbind('ctrl+v, command+v');
    if (this.interval) clearInterval(this.interval);
  };

  init = async (props?: WorkflowPageProps | null, updateState = true): Promise<WorkflowData | undefined> => {
    const {
      actions,
      numberTemplates,
      workflowStatuses,
      match: {
        params: { workflowId }
      }
    } = props || this.props;

    if (updateState) {
      actions.onElementSelect(null);

      this.setState({
        inited: false
      });
    }

    const isFavorite = (await actions.getFavoritesById({
      entity: 'workflow_templates',
      id: workflowId
    })) as Record<string, unknown>;

    this.setState({
      isFavorite: !!Object.keys(isFavorite).length
    });

    if (!numberTemplates) {
      await actions.requestNumberTemplates({
        count: 1000
      });
    }

    if (!workflowStatuses) {
      await actions.requestWorkflowStatuses();
    }

    const workflow = await actions.requestWorkflow(workflowId);

    if (updateState) {
      this.setState({
        inited: true
      });
    }

    return workflow instanceof Error ? undefined : workflow;
  };

  listenTokenExpired = () => {
    const { actions, t } = this.props;

    const sessionLifeTime = (this.config as { sessionLifeTime?: number }).sessionLifeTime || 480;

    const parsed = jwtDecode<{ iat: number }>(storage.getItem('token') as string);

    this.interval = setInterval(() => {
      const startTime = moment(parsed.iat * 1000);
      const endDate = startTime.add(sessionLifeTime, 'minutes');

      const diffMinutes = endDate.diff(moment(), 'minutes');

      if (diffMinutes <= 0) {
        if (this.interval) clearInterval(this.interval);
        return;
      }

      if (diffMinutes < 15) {
        actions.closeError(0);
        actions.addMessage(new Message(t('TokenExpiring', { diff: diffMinutes }), 'permanentWarning'));
      }
    }, 60 * 1000);
  };

  askEventType = (element?: BpmnElementLike | null) => {
    if (!element) return;
    if (element.type !== 'bpmn:IntermediateThrowEvent') return;

    setTimeout(() => {
      const { actions } = this.props;

      this.setState({ askEventType: true });

      actions.onElementSelect(element);
    }, 500);
  };

  showReadOnlyMessage = () => {
    const { actions } = this.props;

    clearTimeout(this.timeout);

    this.timeout = setTimeout(() => {
      actions.closeError(0);
      actions.addError(new Error('FailReadOnlySavingWorkflow'));
    }, 250);
  };

  getNextElementId = (elementId: string, types: string[]) => {
    const { workflow } = propsToData(this.props) as unknown as { workflow: WorkflowData };

    const elementRegistry = (this.modeler as BpmnJsInstance).get('elementRegistry') as {
      getAll: () => BpmnElementLike[];
    };

    const filteredIds = elementRegistry
      .getAll()
      .filter(({ type, id }: BpmnElementLike) => types.includes(type) && id !== elementId)
      .filter(
        ({ businessObject: { id } }: BpmnElementLike) =>
          !types.some((type) => {
            const suffix = type.split(':').pop() as string;
            return id.indexOf(suffix) === 0;
          })
      )
      .map(({ businessObject: { id } }: BpmnElementLike) => parseInt(id.split('-').pop() as string, 10))
      .filter(Number.isInteger)
      .map(String)
      .map((id: string) => id.replace(workflow.id as string, ''))
      .map((id: string) => parseInt(id, 10));

    return Number((workflow.id as string) + padWithZeroes(minUnusedIndex(filteredIds), 3));
  };

  renameLoserCaseXmlTags = (string: string) =>
    string
      .replace(/bpmnlabel/gi, 'BPMNLabel')
      .replace(/bounds/gi, 'Bounds')
      .replace(/bpmnelement/gi, 'bpmnElement')
      .replace(/bpmnshape/gi, 'BPMNShape')
      .replace(/intermediatecatchevent/gi, 'IntermediateCatchEvent')
      .replace(/intermediatethrowevent/gi, 'intermediateThrowEvent')
      .replace(/inclusivegateway/gi, 'InclusiveGateway')
      .replace(/exclusivegateway/gi, 'ExclusiveGateway')
      .replace(/parallelgateway/gi, 'ParallelGateway')
      .replace(/eventbasedgateway/gi, 'EventBasedGateway')
      .replace(/complexgateway/gi, 'ComplexGateway');

  insertCopiedXML = ({ newId, sourceData }: { newId: string; sourceData: { processXml: { tagName: string; name: string }; diagramXML: { id: string; width: string; height: string; labelWidth?: string; labelHeight?: string } } }) => {
    const {
      workflow: { xmlBpmnSchema }
    } = propsToData(this.props) as unknown as { workflow: WorkflowData };

    const { processXml, diagramXML } = sourceData;

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlBpmnSchema as string, 'text/xml');

    const processXmlElement = document.createElement(processXml.tagName);
    processXmlElement.setAttribute('id', newId);
    processXmlElement.setAttribute('name', processXml.name);

    const diagramXMLElement = document.createElement('bpmndi:BPMNShape');
    const diagramXMLElementBounds = document.createElement('dc:Bounds');

    diagramXMLElement.setAttribute('bpmnElement', newId);
    diagramXMLElement.setAttribute('id', diagramXML.id);
    diagramXMLElementBounds.setAttribute('width', diagramXML.width);
    diagramXMLElementBounds.setAttribute('height', diagramXML.height);
    diagramXMLElementBounds.setAttribute('y', '50');
    diagramXMLElementBounds.setAttribute('x', '200');

    diagramXMLElement.appendChild(diagramXMLElementBounds);

    if (diagramXML.labelWidth && diagramXML.labelHeight) {
      const diagramXMLLabel = document.createElement('bpmndi:BPMNLabel');
      const diagramXMLLabelBounds = document.createElement('dc:Bounds');
      diagramXMLLabelBounds.setAttribute('width', diagramXML.labelWidth);
      diagramXMLLabelBounds.setAttribute('height', diagramXML.labelHeight);
      diagramXMLLabelBounds.setAttribute('y', String(Number(diagramXML.height) + 55));
      diagramXMLLabelBounds.setAttribute('x', '190');

      diagramXMLLabel.appendChild(diagramXMLLabelBounds);
      diagramXMLElement.appendChild(diagramXMLLabel);
    }

    const process = xmlDoc.getElementsByTagName('bpmn2:process')[0];
    const BPMNPlane = xmlDoc.getElementsByTagName('bpmndi:BPMNPlane')[0];

    process.appendChild(processXmlElement);
    BPMNPlane.appendChild(diagramXMLElement);

    const oSerializer = new XMLSerializer();

    const xmlToString = oSerializer.serializeToString(xmlDoc);

    return this.renameLoserCaseXmlTags(xmlToString);
  };

  handlePasteCopiedElement = async () => {
    const { copiedElement, actions } = this.props;

    let sourceData: { elementId: string; elementType: string; data: unknown } = copiedElement as never;

    try {
      sourceData = JSON.parse(await navigator.clipboard.readText());
    } catch {
      sourceData = copiedElement as never;
    }

    const { elementId, elementType, data } = sourceData;

    const newId =
      `${elementType}-` +
      (() => {
        const copyData = JSON.parse(JSON.stringify(data));
        const elementName = `${elementType}-${elementId}`;

        switch (elementType) {
          case 'event': {
            const eventId = this.getNextElementId(elementName, eventElementTypes);
            objectPath.set(copyData, 'id', eventId);
            actions.changeEventData(eventId, copyData);
            return eventId;
          }
          case 'task': {
            const taskId = this.getNextElementId(elementName, taskElementTypes);
            objectPath.set(copyData, 'documentTemplateEntity.id', taskId);
            objectPath.set(copyData, 'taskTemplateEntity.id', taskId);
            objectPath.set(copyData, 'taskTemplateEntity.documentTemplateId', taskId);
            actions.changeTaskData(taskId, copyData);
            return taskId;
          }
          case 'gateway': {
            const gatewayId = this.getNextElementId(elementName, gatewayElementTypes);
            objectPath.set(copyData, 'id', gatewayId);
            actions.changeGatewayData(gatewayId, copyData);
            return gatewayId;
          }
          default:
            break;
        }
      })();

    const sXML = this.insertCopiedXML({ newId, sourceData: sourceData as never });

    (this.modeler as BpmnJsInstance).importXML(sXML);

    this.handleWorkflowChange({
      xmlBpmnSchema: sXML
    });

    actions.handleCopyElement(null);

    this.handleSave(elementType);

    this.handleSaveWorkflow();
  };

  handleElementChange = (element: BpmnElementLike) => {
    const { actions } = this.props;
    waiter.addAction(
      'changeElement' + element.id,
      () => elementChange(this.modeler as never)(element as never),
      DELETE_INTERVAL
    );
    actions.onElementChange(element);
  };

  handleDeleteInQueue = (element: BpmnElementLike) => {
    const { origin } = propsToData(this.props) as unknown as { origin: WorkflowData };
    const inQueue = (origin.xmlBpmnSchema as string).indexOf(element.businessObject.id) !== -1;
    return inQueue;
  };

  handleElementCreate = async (element: BpmnElementLike) => {
    const { actions } = this.props;
    const elementId = element.businessObject.id.split('-').pop() as string;

    if (this.workflowDisabled) {
      this.showReadOnlyMessage();
      return;
    }

    await waiter.addAction(
      'createElement' + elementId,
      () => {
        elementCreate(this.modeler as never)(element as never);
        const existed = this.getElements().find(({ id }) => id === element.id);
        if (existed) {
          actions.onElementSelect(existed);
        }
      },
      DELETE_INTERVAL
    );

    this.askEventType(element);
  };

  handleElementDelete = (element: BpmnElementLike) => {
    const { actions } = this.props;
    const elementId = element.businessObject.id.split('-').pop() as string;

    if (this.workflowDisabled) {
      this.showReadOnlyMessage();
      return;
    }

    let deleteElementAction: (() => void) | undefined;

    if ((taskElementTypes as string[]).includes(element.type)) {
      deleteElementAction = () => { actions.deleteTask(elementId); };
    }

    if ((eventElementTypes as string[]).includes(element.type)) {
      deleteElementAction = () => { actions.deleteEvent(elementId); };
    }

    if ((gatewayElementTypes as string[]).includes(element.type) && elementId !== 'end') {
      deleteElementAction = () => { actions.deleteGateway(elementId); };
    }

    actions.onElementSelect(null);

    deleteElementAction &&
      waiter.addAction(
        'deleteElement' + elementId,
        () => {
          const existed = this.getElements().find(({ id }) => id === element.id);

          if (!existed) {
            const delayDelete = this.handleDeleteInQueue(element);
            delayDelete ? this.delQueue.push(deleteElementAction as never) : (deleteElementAction as () => void)();
          } else {
            actions.onElementSelect(existed);
          }

          elementDelete(this.modeler as never)(element as never);
        },
        DELETE_INTERVAL
      );
  };

  handleReady = (modeler: BpmnJsInstance) => {
    this.modeler = modeler;

    if (!this.modeler) return;

    const {
      actions,
      match: {
        params: { selectionId }
      }
    } = this.props;

    actions.onElementSelect((this.modeler.get('elementRegistry') as { get: (id?: string) => unknown }).get(selectionId));

    const { selection } = this.props;

    (this.modeler.get('selection') as { select: (selection: unknown) => void }).select(selection);
  };

  handleWorkflowChange = async (workflowData: Partial<WorkflowData>) => {
    const {
      actions,
      match: {
        params: { workflowId }
      }
    } = this.props;
    await actions.changeWorkflowData(workflowId, workflowData);
  };

  handleSave = async (type?: string) => {
    const { actions, events, gateways, tasks } = this.props;
    const { workflowId, workflow, origin } = propsToData(this.props) as unknown as { workflowId: string; workflow: WorkflowData; origin: WorkflowData };

    if (this.workflowDisabled) {
      this.showReadOnlyMessage();
      return;
    }

    if (!workflow) return;

    const diffs = diff(workflow, origin);

    this.setState({
      busy: true,
      savingElement: true
    });

    const hasUnsavedItems = this.hasUnsavedItems();

    if (this.modeler) {
      const elementIds = this.getElements().map(({ businessObject: { id } }) => id);

      const storeUnsaved = (type: string, storageEntity: EntityStorage, handler: (data: unknown) => Promise<unknown>) => {
        const ids = elementIds.filter(elementsByType(type)).map(normalizeElementId);

        const unsaved = getUnsaved(storageEntity, ids);

        if (!unsaved.length) {
          this.setState({ busy: false });
          this.setState({ savingElement: false });
        }

        unsaved.forEach((id) =>
          this.queue.push(() =>
            handler([
              {
                ...(storageEntity.actual[id] as Record<string, unknown>),
                workflowTemplateId: workflowId
              }
            ])
          )
        );
      };

      switch (type) {
        case 'event': {
          storeUnsaved('event', events, actions.saveEventData);
          break;
        }
        case 'gateway': {
          storeUnsaved('gateway', gateways, actions.saveGatewayData);
          break;
        }
        case 'task': {
          storeUnsaved('task', tasks, actions.saveTaskData);
          break;
        }
        default: {
          storeUnsaved('event', events, actions.saveEventData);
          storeUnsaved('gateway', gateways, actions.saveGatewayData);
          storeUnsaved('task', tasks, actions.saveTaskData);
          break;
        }
      }
    }

    if (!diffs) {
      this.setState({ busy: false });
    }

    if (!hasUnsavedItems) {
      this.setState({ savingElement: false });
    }
  };

  handleSaveWorkflow = () => {
    const {
      workflow,
      workflow: { description, workflowTemplateCategoryId }
    } = propsToData(this.props) as unknown as { workflow: WorkflowData };
    const {
      actions,
      match: {
        params: { workflowId }
      }
    } = this.props;
    const { busy } = this.state;

    if (busy) {
      return;
    }

    if (this.workflowDisabled) {
      this.showReadOnlyMessage();
      return;
    }

    this.setState({
      busy: true
    });

    this.queue.push(async () => {
      await actions.storeWorkflowData(workflowId, {
        ...workflow,
        description: description || undefined,
        workflowTemplateCategoryId: workflowTemplateCategoryId || null
      });

      await this.handleSave();
    });
  };

  handleChangeElement = async (elementData?: { id: string; name?: string }) => {
    const { selection, actions } = this.props;
    const sequenceFlowElement = (this.modeler as BpmnJsInstance).get('elementRegistry') as { get: (id: string) => BpmnElementLike | undefined };
    const foundElement = sequenceFlowElement.get((selection as BpmnElementLike).id);

    if (!foundElement) {
      return;
    }

    if (elementData) {
      const modeling = (this.modeler as BpmnJsInstance).get('modeling') as { updateProperties: (element: unknown, props: unknown) => void };
      try {
        const { id, name } = elementData;
        modeling.updateProperties(foundElement, { id, name });
      } catch {
        // nothing to do
      }
      if ((selection as BpmnElementLike).id !== elementData.id) {
        actions.onElementSelect(sequenceFlowElement.get((selection as BpmnElementLike).id));
      }
    }
    waiter.addAction(
      'changeElement' + foundElement.id,
      () => elementChange(this.modeler as never)(foundElement as never),
      DELETE_INTERVAL
    );
  };

  getElements = (): BpmnElementLike[] => (this.modeler ? (this.modeler.get('elementRegistry') as { getAll: () => BpmnElementLike[] }).getAll() : []);

  blockHotkeysEvent = (blockHotkeys: boolean) => this.setState({ blockHotkeys });

  setBusy = (busy: boolean) => this.setState({ busy });

  hasUnsavedItems = (): boolean | number => {
    const { events, gateways, tasks } = this.props;
    const { workflow, origin } = propsToData(this.props) as unknown as { workflow: WorkflowData; origin: WorkflowData };
    const diffs = diff(workflow, origin);

    // Preserved exactly: the original returns the `diff` *function* itself
    // here (not a boolean, and not `diffs` computed two lines above) when
    // there's no modeler yet. This reads like a copy-paste bug, but every
    // caller of `hasUnsavedItems()` only ever uses the result in a boolean
    // context (`if (!hasUnsavedItems) {...}`), and a function reference is
    // always truthy, so it happens to behave the same as returning `true`
    // — not fixed here, flagged for a human to look at.
    if (!this.modeler) {
      return diff as unknown as boolean;
    }

    const elementIds = this.getElements().map(({ id }) => id);

    const eventIds = elementIds.filter(elementsByType('event')).map(normalizeElementId);
    const gatewayIds = elementIds.filter(elementsByType('gateway')).map(normalizeElementId);
    const taskIds = elementIds.filter(elementsByType('task')).map(normalizeElementId);

    const unsavedEvents = getUnsaved(events, eventIds);
    const unsavedGateways = getUnsaved(gateways, gatewayIds);
    const unsavedTasks = getUnsaved(tasks, taskIds);

    return diffs ? true : ([] as unknown[]).concat(unsavedEvents, unsavedGateways, unsavedTasks).length;
  };

  renderAskEventType = () => {
    const {
      t,
      events: { types },
      classes
    } = this.props;
    const { askEventType } = this.state;

    const onClose = () => this.setState({ askEventType: false });

    const updateEvent = async (id: string | number) => {
      const {
        actions,
        events: { actual },
        selection
      } = this.props;
      if (!selection) {
        return onClose();
      }
      const elementId = selection.businessObject.id.split('-').pop() as string;
      const event = actual[elementId] as { eventTypeId?: string | number };
      event.eventTypeId = id;
      await actions.changeEventData(elementId, event);
      this.handleChangeElement();
      onClose();
    };

    return (
      <Dialog
        open={askEventType}
        scroll="body"
        fullWidth={true}
        maxWidth="sm"
        onClose={onClose}
        classes={{
          paper: classNames(classes.dialogPaper)
        }}
      >
        <DialogTitle
          classes={{
            root: classNames(classes.dialogTitle)
          }}
        >
          {t('AskEventTypeTitle')}
        </DialogTitle>

        <DialogContent>
          <DialogContentText
            classes={{
              root: classNames(classes.dialogTextRoot)
            }}
          >
            {t('AskEventTypeDescr')}
          </DialogContentText>
          <List component="nav">
            {(types || []).map((el) => (
              <ListItem
                key={el.id}
                {...({
                  button: true,
                  selected: el.id === 1,
                  onClick: () => updateEvent(el.id),
                  classes: {
                    selected: classNames(classes.listItemSelected)
                  }
                } as unknown as Record<string, unknown>)}
              >
                <ListItemText
                  primary={t(el.name)}
                  classes={{
                    primary: classNames(classes.listItemRoot)
                  }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions
          classes={{
            root: classNames(classes.dialogActionsRoot)
          }}
        >
          <Button onClick={onClose}>{t('Close')}</Button>
        </DialogActions>
      </Dialog>
    );
  };

  lastEditString = (lastWorkflowHistory?: { id?: string | number; updatedAt?: string; meta?: { firstName?: string; lastName?: string; middleName?: string; name?: string } }) => {
    const {
      t,
      classes,
      match: {
        params: { workflowId }
      }
    } = this.props;
    const { workflow } = propsToData(this.props) as unknown as { workflow: WorkflowData };

    const { firstName, lastName, middleName, name } = (lastWorkflowHistory || {}).meta || {};

    const text = t('WorkflowOldVersionErrorDetailed', {
      person: name || `${firstName} ${lastName} ${middleName}`,
      time: moment((lastWorkflowHistory || {}).updatedAt).fromNow()
    });

    return (
      <>
        <span className={classes.historyText}>{lastWorkflowHistory ? text : ''}</span>

        <WorkflowVersions
          initWorkflow={this.init.bind(this)}
          workflowId={workflowId}
          lastWorkflowHistoryId={workflow?.lastWorkflowHistory?.id}
          lastWorkflowHistoryVersion={workflow?.lastWorkflowHistory?.version}
        />
      </>
    );
  };

  beforeunloadAction = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = '';
  };

  onElementSelect = (event: BpmnElementLike) => {
    const { actions, events, gateways, tasks } = this.props;
    const { type, id } = event;

    actions.onElementSelect(event);

    if (type !== 'label') return;

    const targetElement = id.replace('_label', '').split('-');

    const targetType = targetElement[0];
    const targetId = targetElement[1];

    switch (targetType) {
      case 'gateway': {
        waiter.addAction(
          'reguestGateway',
          async () => {
            if (gateways?.actual[targetId]) return;
            await actions.requestGateway(targetId);
            await actions.getGatewayTypes();
          },
          REQUEST_ELEMENTS_INTERVAL
        );
        break;
      }
      case 'event': {
        waiter.addAction(
          'reguestEvents',
          async () => {
            if (events?.actual[targetId]) return;
            await actions.requestEvent(targetId);
          },
          REQUEST_ELEMENTS_INTERVAL
        );
        break;
      }
      case 'tasks': {
        waiter.addAction(
          'reguestTasks',
          async () => {
            if (tasks?.actual[targetId]) return;
            await actions.requestTask(targetId);
          },
          REQUEST_ELEMENTS_INTERVAL
        );
        break;
      }
      default: {
        break;
      }
    }
  };

  checkProcessIsPristine = () => {
    const { workflow, origin } = propsToData(this.props) as unknown as { workflow: WorkflowData; origin: WorkflowData };
    const { events, gateways, tasks } = this.props;

    if (!workflow) return true;

    const diffsWorkflows = diff(cleanDeep(workflow) as never, cleanDeep(origin) as never);
    const diffsEvents = diff(events?.actual, events?.origin);
    const diffsGateways = diff(gateways?.actual, gateways?.origin);
    const diffsTasks = diff(tasks?.actual, tasks?.origin);

    const diffs = diffsWorkflows || diffsEvents || diffsGateways || diffsTasks;

    if (!diffs) {
      window.removeEventListener('beforeunload', this.beforeunloadAction as never);
    } else {
      window.addEventListener('beforeunload', this.beforeunloadAction as never);
    }

    return !diffs;
  };

  renderContent = () => {
    const {
      t,
      classes,
      selection,
      workflowStatuses,
      numberTemplates,
      match: {
        params: { workflowId }
      },
      copiedElement
    } = this.props;
    const { workflow } = propsToData(this.props) as unknown as { workflow: WorkflowData };
    const { saved, error, inited, blockHotkeys, busy, savingElement } = this.state;

    if (!workflow || !inited) return <Preloader flex={true} />;

    const isPristine = this.checkProcessIsPristine();

    const workflowElements = this.getElements();

    const events = workflowElements.filter(elementsByType('event')).map(elementToMenuItem as never);
    const taskTemplates = workflowElements.filter(elementsByType('task')).map(elementToMenuItem as never);

    return (
      <DrawerContent {...({ disableScrolls: true } as unknown as Record<string, unknown>)}>
        <div className={classes.root}>
          <AppBar position="relative" color="transparent">
            <Toolbar disableGutters={true} className={classes.toolbar}>
              {this.lastEditString(workflow?.lastWorkflowHistory)}

              <div style={{ flexGrow: 1 }} />

              {copiedElement ? (
                <Tooltip title={t('PasteElement')}>
                  <IconButton onClick={this.handlePasteCopiedElement} size="large">
                    <InsertDriveFileIcon className={classes.pasteElementButton} />
                  </IconButton>
                </Tooltip>
              ) : null}

              <RightSidebar
                t={t}
                busy={busy}
                saved={saved}
                error={error}
                workflow={workflow}
                workflowId={workflowId}
                workflowStatuses={workflowStatuses}
                numberTemplates={numberTemplates}
                selection={selection}
                events={events}
                taskTemplates={taskTemplates}
                initWorkflow={this.init.bind(this)}
                modeler={this.modeler}
                onChangeSettings={this.handleWorkflowChange}
                handleChangeElement={this.handleChangeElement}
                handleSaveWorkflow={this.handleSaveWorkflow}
                handleSave={this.handleSave}
                savingElement={savingElement}
                setBusy={this.setBusy}
                blockHotkeysEvent={this.blockHotkeysEvent}
                isPristine={isPristine}
              />
            </Toolbar>
          </AppBar>

          <BPMNEditor
            id={`${workflowId}_editor`}
            schemaId={workflowId}
            diagram={workflow.xmlBpmnSchema}
            onReady={this.handleReady}
            onChange={(xmlBpmnSchema: string) => this.handleWorkflowChange({ xmlBpmnSchema })}
            onElementChange={this.handleElementChange}
            onElementSelect={this.onElementSelect}
            onElementCreate={this.handleElementCreate}
            onElementDelete={this.handleElementDelete}
            blockHotkeys={blockHotkeys}
          />
        </div>

        {this.renderAskEventType()}
      </DrawerContent>
    );
  };

  // Base class declares this as `(params) => string`, but this override
  // returns JSX (a name-editing widget) when called with no args from
  // render() below — cast the JSX branch's return rather than loosening the
  // shared `ModulePage` base type other subclasses also rely on.
  componentGetTitle = (props?: { returnTitle: boolean }): string => {
    const { returnTitle } = props || {};
    const { t, title, classes, actions } = this.props;
    const { workflow } = propsToData(this.props) as unknown as { workflow: WorkflowData };

    const titleOutput = workflow ? workflow.name : t(title as string);

    if (returnTitle) return titleOutput as string;

    const { changingName, newName, isFavorite } = this.state;

    const favoritesTooltip = isFavorite ? t('RemoveFromFavorites') : t('AddToFavorites');

    const handleOpen = () =>
      this.setState({
        changingName: true,
        newName: workflow?.name
      });

    const handleClose = () =>
      this.setState({
        changingName: false,
        newName: ''
      });

    const handleChangeName = (value: string) => this.setState({ newName: value });

    const handleSaveName = async () => {
      if (!newName.length) return;
      workflow.name = newName;
      await this.handleWorkflowChange(workflow);
      this.handleSaveWorkflow();
      this.setState({ changingName: false });
    };

    const handleToggleFavorite = async () => {
      const regBody = {
        entity: 'workflow_templates',
        id: workflow?.id as string | number
      };

      if (isFavorite) {
        await actions.deleteFavorites(regBody);
        this.setState({ isFavorite: false });
      } else {
        await actions.addFavorites(regBody);
        this.setState({ isFavorite: true });
      }
    };

    const StringElement = StringElementRaw as unknown as React.ComponentType<Record<string, unknown>>;
    const RenderOneLine = RenderOneLineRaw as unknown as React.ComponentType<Record<string, unknown>>;

    return (
      <div className={classes.changeNameWrapper}>
        {!changingName ? (
          <>
            <RenderOneLine title={titleOutput} textParams={'400 30px Roboto'} />

            <Tooltip title={t('EditName')}>
              <IconButton onClick={handleOpen} className={classes.iconWrapper} size="large">
                <CreateIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={favoritesTooltip}>
              <IconButton
                onClick={handleToggleFavorite}
                className={classes.iconWrapper}
                size="large"
              >
                {isFavorite ? <StarIcon className={classes.iconFilled} /> : <StarBorderIcon />}
              </IconButton>
            </Tooltip>

            <Link to={`/workflow/journal#workflowTemplateId=${workflow?.id}`}>
              <Tooltip title={t('JournalView')}>
                <IconButton size="large" className={classes.iconWrapper}>
                  <img src={ListIcon} alt="list icon" width={21} />
                </IconButton>
              </Tooltip>
            </Link>
          </>
        ) : (
          <>
            <StringElement
              required={true}
              fullWidth={true}
              onChange={handleChangeName}
              value={newName}
              darkTheme={true}
              noMargin={true}
              variant={'outlined'}
              notRequiredLabel={''}
              error={
                !newName.length
                  ? {
                      keyword: '',
                      message: t('RequiredField')
                    }
                  : false
              }
            />
            <IconButton onClick={handleSaveName} className={classes.iconWrapper} size="large">
              <DoneIcon />
            </IconButton>

            <IconButton onClick={handleClose} className={classes.iconWrapper} size="large">
              <CloseOutlinedIcon />
            </IconButton>
          </>
        )}
      </div>
    ) as unknown as string;
  };

  render = () => {
    const { loading, location } = this.props;
    const { workflow } = propsToData(this.props) as unknown as { workflow: WorkflowData };

    return (
      <LeftSidebarLayout
        location={location}
        title={this.componentGetTitle() as React.ReactNode}
        loading={loading}
        flexContent={true}
        workflowId={workflow?.id}
        workflowTags={workflow?.tags}
      >
        {this.renderContent()}
      </LeftSidebarLayout>
    );
  };
}

interface ConnectedState {
  workflow: {
    selection?: BpmnElementLike | null;
    actual: Record<string, unknown>;
    origin: Record<string, unknown>;
    categories: unknown;
    statuses: unknown[];
    copiedElement: { elementId: string; elementType: string; data: unknown } | null;
  };
  numberTemplates: { list: unknown[] };
  events: EntityStorage & { types?: { id: string | number; name: string }[] };
  gateways: EntityStorage;
  tasks: EntityStorage;
}

const mapStateToProps = ({
  workflow: { selection, actual, origin, categories, statuses, copiedElement },
  numberTemplates: { list: numberTemplates },
  events,
  gateways,
  tasks
}: ConnectedState) => ({
  selection,
  actualWorkflowList: actual,
  originWorkflowList: origin,
  workflowCategories: categories,
  workflowStatuses: statuses,
  numberTemplates,
  events,
  gateways,
  tasks,
  copiedElement
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    addError: bindActionCreators(addError, dispatch),
    closeError: bindActionCreators(closeError, dispatch),
    deleteTask: bindActionCreators(deleteTask, dispatch),
    saveTaskData: bindActionCreators(saveTaskData, dispatch),
    deleteEvent: bindActionCreators(deleteEvent, dispatch),
    saveEventData: bindActionCreators(saveEventData, dispatch),
    deleteGateway: bindActionCreators(deleteGateway, dispatch),
    saveGatewayData: bindActionCreators(saveGatewayData, dispatch),
    requestWorkflow: bindActionCreators(requestWorkflow, dispatch),
    changeWorkflowData: bindActionCreators(changeWorkflowData, dispatch),
    storeWorkflowData: bindActionCreators(storeWorkflowData, dispatch),
    onElementChange: bindActionCreators(onElementChange, dispatch),
    onElementSelect: bindActionCreators(onElementSelect, dispatch),
    requestNumberTemplates: bindActionCreators(requestNumberTemplates, dispatch),
    requestWorkflowStatuses: bindActionCreators(requestWorkflowStatuses, dispatch),
    changeEventData: bindActionCreators(changeEventData, dispatch),
    handleCopyElement: bindActionCreators(handleCopyElement, dispatch),
    changeTaskData: bindActionCreators(changeTaskData, dispatch),
    changeGatewayData: bindActionCreators(changeGatewayData, dispatch),
    deleteFavorites: bindActionCreators(deleteFavorites, dispatch),
    addFavorites: bindActionCreators(addFavorites, dispatch),
    getFavoritesById: bindActionCreators(getFavoritesById, dispatch),
    requestGateway: bindActionCreators(requestGateway, dispatch),
    getGatewayTypes: bindActionCreators(getGatewayTypes, dispatch),
    requestEvent: bindActionCreators(requestEvent, dispatch),
    requestTask: bindActionCreators(requestTask, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch)
  }
});

const styled = withStyles(styles)(WorkflowPage as never);
const translated = translate('WorkflowAdminPage')(styled as never);
export default connect(mapStateToProps as never, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
