import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import queue from 'queue';
import diff from 'helpers/diff';
import moment from 'moment';
import objectPath from 'object-path';
import hotkeys from 'hotkeys-js';
import classNames from 'classnames';
import cleanDeep from 'clean-deep';
import jwtDecode from 'jwt-decode';
import { Link } from 'react-router-dom';
import LeftSidebarLayout, { DrawerContent } from 'layouts/LeftSidebar';
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

import StringElement from 'components/JsonSchema/elements/StringElement';
import Preloader from 'components/Preloader';
import ModulePage from 'components/ModulePage';
import { BPMNEditor } from 'components/BpmnSchema';
import Message from 'components/Snackbars/Message';

import waiter from 'helpers/waitForAction';
import minUnusedIndex from 'helpers/minUnusedIndex';
import padWithZeroes from 'helpers/padWithZeroes';
import RenderOneLine from 'helpers/renderOneLine';
import storage from 'helpers/storage';

import ListIcon from 'assets/img/logs_icon.svg';
import propsToData from './helpers/propsToData';
import elementsByType from './helpers/elementsByType';
import normalizeElementId from './helpers/normalizeElementId';
import elementToMenuItem from './helpers/elementToMenuItem';

import WorkflowVersions from './components/WorkflowVersions';
import RightSidebar from './components/RightSidebar';

import { elementCreate, elementDelete, elementChange } from './handlers';
import { getConfig } from '../../../../../core/helpers/configLoader';

const DELETE_INTERVAL = 100;
const REQUEST_ELEMENTS_INTERVAL = 100;

const styles = (theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
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

const getUnsaved = ({ actual, origin }, ids) =>
  Object.keys(actual)
    .map((itemId) => parseInt(itemId, 10))
    .filter((itemId) => ids.includes(itemId))
    .filter((itemId) => JSON.stringify(actual[itemId]) !== JSON.stringify(origin[itemId]));

class WorkflowPage extends ModulePage {
  constructor(props) {
    super(props);
    const { actions } = props;

    this.config = getConfig();

    this.state = {
      error: null,
      busy: false,
      inited: false,
      blockHotkeys: false,
      askEventType: false,
      changingName: false,
      isFavorite: false,
      newName: ''
    };

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

    this.interval = null;
    this.delQueue = queue({ autostart: false });
    this.queue = queue({ autostart: true, concurrency: 1 });

    this.delQueue.on('start', onStartSave);

    this.delQueue.on('end', onFinishSave);

    this.queue.on('end', () => {
      if (this.delQueue.jobs.length) {
        this.delQueue.start();
      } else {
        onFinishSave();
      }
    });

    this.queue.on('success', (result) => {
      if (result instanceof Error) {
        if (result.message === 'Header Last-Workflow-History-Id expired.') {
          const error = new Error('WorkflowOldVersionError');

          const { details } = result.response;

          if (details) {
            const { lastWorkflowHistory } = details.pop();

            if (!lastWorkflowHistory) return;

            error.details = this.lastEditString(lastWorkflowHistory);
          }
          actions.addError(error);
        } else {
          const error = new Error('ErrorSavingWorkflow');
          error.details = (result.response && result.response.errors) || result.message;
          actions.addError(error);
        }
        this.setState({ error: result });
      }
    });

    const { workflowDisabled } = this.config;
    this.workflowDisabled = workflowDisabled || false;
  }

  componentDidMount = () => {
    this.init(this.props);
    hotkeys('ctrl+v, command+v', this.handlePasteCopiedElement);
    this.listenTokenExpired();
  };

  componentDidUpdate = ({
    match: {
      params: { workflowId }
    }
  }) => {
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
    clearInterval(this.interval);
  };

  init = async (props, updateState = true) => {
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

    const isFavorite = await actions.getFavoritesById({
      entity: 'workflow_templates',
      id: workflowId
    });

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

    return workflow;
  };

  listenTokenExpired = () => {
    const { actions, t } = this.props;

    const sessionLifeTime = this.config.sessionLifeTime || 480;

    const parsed = jwtDecode(storage.getItem('token'));

    this.interval = setInterval(() => {
      const startTime = moment(parsed.iat * 1000);
      const endDate = startTime.add(sessionLifeTime, 'minutes');

      const diff = endDate.diff(moment(), 'minutes');

      if (diff <= 0) {
        clearInterval(this.interval);
        return;
      }

      if (diff < 15) {
        actions.closeError(0);
        actions.addMessage(new Message(t('TokenExpiring', { diff }), 'permanentWarning'));
      }
    }, 60 * 1000);
  };

  askEventType = (element) => {
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

  getNextElementId = (elementId, types) => {
    const { workflow } = propsToData(this.props);

    const ids = this.modeler
      .get('elementRegistry')
      .getAll()
      .filter(({ type, id }) => types.includes(type) && id !== elementId)
      .filter(
        ({ businessObject: { id } }) =>
          !types.some((type) => {
            const suffix = type.split(':').pop();
            return id.indexOf(suffix) === 0;
          })
      )
      .map(({ businessObject: { id } }) => parseInt(id.split('-').pop(), 10))
      .filter(Number.isInteger)
      .map(String)
      .map((id) => id.replace(workflow.id, ''))
      .map((id) => parseInt(id, 10));

    return Number(workflow.id + padWithZeroes(minUnusedIndex(ids, 1), 3));
  };

  renameLoserCaseXmlTags = (string) =>
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

  insertCopiedXML = ({ newId, sourceData }) => {
    const {
      workflow: { xmlBpmnSchema }
    } = propsToData(this.props);

    const { processXml, diagramXML } = sourceData;

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlBpmnSchema, 'text/xml');

    const processXmlElement = document.createElement(processXml.tagName);
    processXmlElement.setAttribute('id', newId);
    processXmlElement.setAttribute('name', processXml.name);

    const diagramXMLElement = document.createElement('bpmndi:BPMNShape');
    const diagramXMLElementBounds = document.createElement('dc:Bounds');

    diagramXMLElement.setAttribute('bpmnElement', newId);
    diagramXMLElement.setAttribute('id', diagramXML.id);
    diagramXMLElementBounds.setAttribute('width', diagramXML.width);
    diagramXMLElementBounds.setAttribute('height', diagramXML.height);
    diagramXMLElementBounds.setAttribute('y', 50);
    diagramXMLElementBounds.setAttribute('x', 200);

    diagramXMLElement.appendChild(diagramXMLElementBounds);

    if (diagramXML.labelWidth && diagramXML.labelHeight) {
      const diagramXMLLabel = document.createElement('bpmndi:BPMNLabel');
      const diagramXMLLabelBounds = document.createElement('dc:Bounds');
      diagramXMLLabelBounds.setAttribute('width', diagramXML.labelWidth);
      diagramXMLLabelBounds.setAttribute('height', diagramXML.labelHeight);
      diagramXMLLabelBounds.setAttribute('y', Number(diagramXML.height) + 55);
      diagramXMLLabelBounds.setAttribute('x', 190);

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

    let sourceData = {};

    try {
      sourceData = JSON.parse(await navigator.clipboard.readText());
    } catch {
      sourceData = copiedElement;
    }

    const { elementId, elementType, data } = sourceData;

    const newId =
      `${elementType}-` +
      (() => {
        const copyData = JSON.parse(JSON.stringify(data));
        const elementName = `${elementType}-${elementId}`;

        switch (elementType) {
          case 'event':
            const eventId = this.getNextElementId(elementName, eventElementTypes);
            objectPath.set(copyData, 'id', eventId);
            actions.changeEventData(eventId, copyData);
            return eventId;
          case 'task':
            const taskId = this.getNextElementId(elementName, taskElementTypes);
            objectPath.set(copyData, 'documentTemplateEntity.id', taskId);
            objectPath.set(copyData, 'taskTemplateEntity.id', taskId);
            objectPath.set(copyData, 'taskTemplateEntity.documentTemplateId', taskId);
            actions.changeTaskData(taskId, copyData);
            return taskId;
          case 'gateway':
            const gatewayId = this.getNextElementId(elementName, gatewayElementTypes);
            objectPath.set(copyData, 'id', gatewayId);
            actions.changeGatewayData(gatewayId, copyData);
            return gatewayId;
          default:
            break;
        }
      })();

    const sXML = this.insertCopiedXML({ newId, sourceData });

    this.modeler.importXML(sXML);

    this.handleWorkflowChange({
      xmlBpmnSchema: sXML
    });

    actions.handleCopyElement(null);

    this.handleSave(elementType);

    this.handleSaveWorkflow();
  };

  handleElementChange = (element) => {
    const { actions } = this.props;
    waiter.addAction(
      'changeElement' + element.id,
      () => elementChange(this.modeler)(element),
      DELETE_INTERVAL
    );
    actions.onElementChange(element);
  };

  handleDeleteInQueue = (element) => {
    const { origin } = propsToData(this.props);
    const inQueue = origin.xmlBpmnSchema.indexOf(element.businessObject.id) !== -1;
    return inQueue;
  };

  handleElementCreate = async (element) => {
    const { actions } = this.props;
    const elementId = element.businessObject.id.split('-').pop();

    if (this.workflowDisabled) {
      this.showReadOnlyMessage();
      return;
    }

    await waiter.addAction(
      'createElement' + elementId,
      () => {
        elementCreate(this.modeler)(element);
        const existed = this.getElements().find(({ id }) => id === element.id);
        if (existed) {
          actions.onElementSelect(existed);
        }
      },
      DELETE_INTERVAL
    );

    this.askEventType(element);
  };

  handleElementDelete = (element) => {
    const { actions } = this.props;
    const elementId = element.businessObject.id.split('-').pop();

    if (this.workflowDisabled) {
      this.showReadOnlyMessage();
      return;
    }

    let deleteElementAction;

    if (taskElementTypes.includes(element.type)) {
      deleteElementAction = () => actions.deleteTask(elementId);
    }

    if (eventElementTypes.includes(element.type)) {
      deleteElementAction = () => actions.deleteEvent(elementId);
    }

    if (gatewayElementTypes.includes(element.type) && elementId !== 'end') {
      deleteElementAction = () => actions.deleteGateway(elementId);
    }

    actions.onElementSelect(null);

    deleteElementAction &&
      waiter.addAction(
        'deleteElement' + elementId,
        () => {
          const existed = this.getElements().find(({ id }) => id === element.id);

          if (!existed) {
            const delayDelete = this.handleDeleteInQueue(element);
            delayDelete ? this.delQueue.push(deleteElementAction) : deleteElementAction();
          } else {
            actions.onElementSelect(existed);
          }

          elementDelete(this.modeler)(element);
        },
        DELETE_INTERVAL
      );
  };

  handleReady = (modeler) => {
    this.modeler = modeler;

    if (!this.modeler) return;

    const {
      actions,
      match: {
        params: { selectionId }
      }
    } = this.props;

    actions.onElementSelect(this.modeler.get('elementRegistry').get(selectionId));

    const { selection } = this.props;

    this.modeler.get('selection').select(selection);
  };

  handleWorkflowChange = async (workflowData) => {
    const {
      actions,
      match: {
        params: { workflowId }
      }
    } = this.props;
    await actions.changeWorkflowData(workflowId, workflowData);
  };

  handleSave = async (type) => {
    const { actions, events, gateways, tasks } = this.props;
    const { workflowId, workflow, origin } = propsToData(this.props);

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

      const storeUnsaved = (type, storage, handler) => {
        const ids = elementIds.filter(elementsByType(type)).map(normalizeElementId);

        const unsaved = getUnsaved(storage, ids);

        if (!unsaved.length) {
          this.setState({ busy: false });
          this.setState({ savingElement: false });
        }

        unsaved.forEach((id) =>
          this.queue.push(() =>
            handler([
              {
                ...storage.actual[id],
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
    } = propsToData(this.props);
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

  handleChangeElement = async (elementData) => {
    const { selection, actions } = this.props;
    const sequenceFlowElement = this.modeler.get('elementRegistry').get(selection.id);

    if (!sequenceFlowElement) {
      return;
    }

    if (elementData) {
      const modeling = this.modeler.get('modeling');
      try {
        const { id, name } = elementData;
        modeling.updateProperties(sequenceFlowElement, { id, name });
      } catch (e) {
        // nothing to do
      }
      if (selection.id !== elementData.id) {
        actions.onElementSelect(this.modeler.get('elementRegistry').get(selection.id));
      }
    }
    waiter.addAction(
      'changeElement' + sequenceFlowElement.id,
      () => elementChange(this.modeler)(sequenceFlowElement),
      DELETE_INTERVAL
    );
  };

  getElements = () => (this.modeler ? this.modeler.get('elementRegistry').getAll() : []);

  blockHotkeysEvent = (blockHotkeys) => this.setState({ blockHotkeys });

  setBusy = (busy) => this.setState({ busy });

  hasUnsavedItems = () => {
    const { events, gateways, tasks } = this.props;
    const { workflow, origin } = propsToData(this.props);
    const diffs = diff(workflow, origin);

    if (!this.modeler) {
      return diff;
    }

    const elementIds = this.getElements().map(({ id }) => id);

    const eventIds = elementIds.filter(elementsByType('event')).map(normalizeElementId);
    const gatewayIds = elementIds.filter(elementsByType('gateway')).map(normalizeElementId);
    const taskIds = elementIds.filter(elementsByType('task')).map(normalizeElementId);

    const unsavedEvents = getUnsaved(events, eventIds);
    const unsavedGateways = getUnsaved(gateways, gatewayIds);
    const unsavedTasks = getUnsaved(tasks, taskIds);

    return diffs || [].concat(unsavedEvents, unsavedGateways, unsavedTasks).length;
  };

  renderAskEventType = () => {
    const {
      t,
      events: { types },
      classes
    } = this.props;
    const { askEventType } = this.state;

    const onClose = () => this.setState({ askEventType: false });

    const updateEvent = async (id) => {
      const {
        actions,
        events: { actual },
        selection
      } = this.props;
      if (!selection) {
        return onClose();
      }
      const elementId = selection.businessObject.id.split('-').pop();
      const event = actual[elementId];
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
                button={true}
                key={el.id}
                selected={el.id === 1}
                onClick={() => updateEvent(el.id)}
                classes={{
                  selected: classNames(classes.listItemSelected)
                }}
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

  lastEditString = (lastWorkflowHistory) => {
    const {
      t,
      classes,
      match: {
        params: { workflowId }
      }
    } = this.props;
    const { workflow } = propsToData(this.props);

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

  beforeunloadAction = (event) => {
    event.preventDefault();
    event.returnValue = '';
  };

  onElementSelect = (event) => {
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
    const { workflow, origin } = propsToData(this.props);
    const { events, gateways, tasks } = this.props;

    if (!workflow) return true;

    const diffsWorkflows = diff(cleanDeep(workflow), cleanDeep(origin));
    const diffsEvents = diff(events?.actual, events?.origin);
    const diffsGateways = diff(gateways?.actual, gateways?.origin);
    const diffsTasks = diff(tasks?.actual, tasks?.origin);

    const diffs = diffsWorkflows || diffsEvents || diffsGateways || diffsTasks;

    if (!diffs) {
      window.removeEventListener('beforeunload', this.beforeunloadAction);
    } else {
      window.addEventListener('beforeunload', this.beforeunloadAction);
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
    const { workflow } = propsToData(this.props);
    const { saved, error, inited, blockHotkeys, busy, savingElement } = this.state;

    if (!workflow || !inited) return <Preloader flex={true} />;

    const isPristine = this.checkProcessIsPristine();

    const workflowElements = this.getElements();

    const events = workflowElements.filter(elementsByType('event')).map(elementToMenuItem);
    const taskTemplates = workflowElements.filter(elementsByType('task')).map(elementToMenuItem);

    return (
      <DrawerContent disableScrolls={true}>
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
            onChange={(xmlBpmnSchema) => this.handleWorkflowChange({ xmlBpmnSchema })}
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

  componentGetTitle = (props) => {
    const { returnTitle } = props || {};
    const { t, title, classes, actions } = this.props;
    const { workflow } = propsToData(this.props);

    const titleOutput = workflow ? workflow.name : t(title);

    if (returnTitle) return titleOutput;

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

    const handleChangeName = (value) => this.setState({ newName: value });

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
        id: workflow?.id
      };

      if (isFavorite) {
        await actions.deleteFavorites(regBody);
        this.setState({ isFavorite: false });
      } else {
        await actions.addFavorites(regBody);
        this.setState({ isFavorite: true });
      }
    };

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
    );
  };

  render = () => {
    const { loading, location } = this.props;
    const { workflow } = propsToData(this.props);

    return (
      <LeftSidebarLayout
        location={location}
        title={this.componentGetTitle()}
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

const mapStateToProps = ({
  workflow: { selection, actual, origin, categories, statuses, copiedElement },
  numberTemplates: { list: numberTemplates },
  events,
  gateways,
  tasks
}) => ({
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

const mapDispatchToProps = (dispatch) => ({
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

const styled = withStyles(styles)(WorkflowPage);
const translated = translate('WorkflowAdminPage')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
