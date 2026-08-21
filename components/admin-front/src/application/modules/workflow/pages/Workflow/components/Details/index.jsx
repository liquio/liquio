import React from 'react';
import { Button } from '@mui/material';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { history } from 'store';
import { changeEventData, undoEventData } from 'application/actions/events';
import { changeTaskData, undoTaskData } from 'application/actions/tasks';
import {
  changeGatewayData,
  undoGateWayData,
} from 'application/actions/gateways';
import { handleCopyElement } from 'application/actions/workflow';
import Message from 'components/Snackbars/Message';
import gatewayElementTypes from 'modules/workflow/variables/gatewayElementTypes';
import { addMessage } from 'actions/error';
import formElements from './elements';
import Copy from 'assets/img/copy_24px.svg';

const getElementId = ({ businessObject: { id } }) =>
  parseInt(id.split('-').pop(), 10);
const getElementType = ({ businessObject: { id } }) => id.split('-').shift();

const ElementDetails = ({
  numberTemplates,
  selection,
  workflow,
  modeler,
  onChange,
  blockHotkeysEvent,
  openSelection,
  t,
  busy,
  setBusy,
  actions,
  handleSave,
  actualTaskList,
  actualGatewayList,
  actualEventList,
  classes,
}) => {
  const CustomElementDetails = selection && formElements[selection.type];

  if (!CustomElementDetails) return null;

  const handleCopyElement = () => {
    const { id } = selection;
    const elementId = getElementId(selection);
    const elementType = getElementType(selection);

    const datToCopy = {
      elementId,
      elementType,
      processXml: {},
      diagramXML: {},
      data: null,
    };

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(workflow.xmlBpmnSchema, 'text/xml');

    datToCopy.processXml = {
      tagName: xmlDoc.getElementById(id).tagName,
      id: xmlDoc.getElementById(id).getAttribute('id'),
      name: xmlDoc.getElementById(id).getAttribute('name'),
    };

    const visualisation = Array.from(
      xmlDoc.getElementsByTagName('bpmndi:BPMNShape'),
    )
      .filter((e) => e.getAttribute('bpmnElement') === id)
      .pop();
    const labelTag = visualisation.getElementsByTagName('bpmndi:BPMNLabel');

    datToCopy.diagramXML = {
      id: visualisation.getAttribute('id'),
      bpmnElement: visualisation.getAttribute('bpmnElement'),
      width: visualisation
        .getElementsByTagName('dc:Bounds')[0]
        .getAttribute('width'),
      height: visualisation
        .getElementsByTagName('dc:Bounds')[0]
        .getAttribute('height'),
      labelWidth: labelTag.length
        ? labelTag[0].getElementsByTagName('dc:Bounds')[0].getAttribute('width')
        : null,
      labelHeight: labelTag.length
        ? labelTag[0]
            .getElementsByTagName('dc:Bounds')[0]
            .getAttribute('height')
        : null,
    };

    switch (elementType) {
      case 'event':
        datToCopy.data = actualEventList[elementId];
        break;
      case 'task':
        datToCopy.data = actualTaskList[elementId];
        break;
      case 'gateway':
        datToCopy.data = actualGatewayList[elementId];
        break;
      default:
        break;
    }

    actions.handleCopyElement(datToCopy);
    actions.addMessage(new Message('Copied', 'success'));
    navigator.clipboard.writeText(JSON.stringify(datToCopy));
  };

  const undoChanges = () => {
    const elementType = getElementType(selection);

    switch (elementType) {
      case 'event':
        actions.undoEventData(getElementId(selection));
        break;
      case 'task':
        actions.undoTaskData(getElementId(selection));
        break;
      case 'gateway':
        actions.undoGateWayData(getElementId(selection));
        break;
      default:
        break;
    }
  };

  const onClose = () => {
    if (openSelection) {
      history.replace(`/workflow/${workflow.id}`);
    }

    blockHotkeysEvent(false);

    undoChanges();
  };

  const isGateWay = gatewayElementTypes.includes(selection?.type);

  return (
    <>
      <CustomElementDetails
        numberTemplates={numberTemplates}
        selectionId={selection.businessObject.id}
        element={selection}
        workflow={workflow}
        modeler={modeler}
        onChange={onChange}
        handleSave={handleSave}
        busy={busy}
        setBusy={setBusy}
        onClose={onClose}
      />
      {!isGateWay ? (
        <Button
          onClick={handleCopyElement}
          className={classes.copyElementButton}
        >
          <img src={Copy} alt={'copy'} />
          {t('CopyElement')}
        </Button>
      ) : null}
    </>
  );
};

const mapStateToProps = ({
  tasks: { actual: actualTaskList },
  gateways: { actual: actualGatewayList },
  events: { actual: actualEventList },
}) => ({
  actualTaskList,
  actualGatewayList,
  actualEventList,
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    addMessage: bindActionCreators(addMessage, dispatch),
    changeEventData: bindActionCreators(changeEventData, dispatch),
    changeGatewayData: bindActionCreators(changeGatewayData, dispatch),
    changeTaskData: bindActionCreators(changeTaskData, dispatch),
    undoEventData: bindActionCreators(undoEventData, dispatch),
    undoTaskData: bindActionCreators(undoTaskData, dispatch),
    undoGateWayData: bindActionCreators(undoGateWayData, dispatch),
    handleCopyElement: bindActionCreators(handleCopyElement, dispatch),
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(ElementDetails);
