import React from 'react';
import { Button } from '@mui/material';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
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

interface BpmnBusinessObject {
  id: string;
  [key: string]: unknown;
}

interface BpmnSelection {
  id: string;
  type: string;
  businessObject: BpmnBusinessObject;
}

const getElementId = ({ businessObject: { id } }: { businessObject: { id: string } }) =>
  parseInt(id.split('-').pop() as string, 10);
const getElementType = ({ businessObject: { id } }: { businessObject: { id: string } }) => id.split('-').shift();

interface DataToCopy {
  elementId: number;
  elementType?: string;
  processXml: Record<string, unknown>;
  diagramXML: Record<string, unknown>;
  data: unknown;
}

interface ElementDetailsProps {
  numberTemplates?: unknown;
  selection?: BpmnSelection | null;
  workflow: { id?: string | number; xmlBpmnSchema: string };
  modeler?: BpmnJsInstance | null;
  onChange: (businessObject: BpmnBusinessObject) => void;
  blockHotkeysEvent: (block: boolean) => void;
  openSelection?: boolean;
  t: (key: string) => string;
  busy?: boolean;
  setBusy: (busy: boolean) => void;
  actions: {
    addMessage: (message: unknown) => void;
    changeEventData: (eventId: number, data: unknown) => unknown;
    changeGatewayData: (gatewayId: number, data: unknown) => unknown;
    changeTaskData: (taskId: number, data: unknown) => unknown;
    undoEventData: (eventId: number) => unknown;
    undoTaskData: (taskId: number) => unknown;
    undoGateWayData: (gatewayId: number) => unknown;
    handleCopyElement: (payload: DataToCopy) => unknown;
  };
  handleSave?: boolean;
  actualTaskList: Record<string, unknown>;
  actualGatewayList: Record<string, unknown>;
  actualEventList: Record<string, unknown>;
  classes: Record<string, string>;
}

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
}: ElementDetailsProps) => {
  const CustomElementDetails = selection && formElements[selection.type];

  if (!CustomElementDetails) return null;

  const handleCopyElement = () => {
    const { id } = selection as BpmnSelection;
    const elementId = getElementId(selection as BpmnSelection);
    const elementType = getElementType(selection as BpmnSelection);

    const datToCopy: DataToCopy = {
      elementId,
      elementType,
      processXml: {},
      diagramXML: {},
      data: null,
    };

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(workflow.xmlBpmnSchema, 'text/xml');

    datToCopy.processXml = {
      tagName: (xmlDoc.getElementById(id) as Element).tagName,
      id: (xmlDoc.getElementById(id) as Element).getAttribute('id'),
      name: (xmlDoc.getElementById(id) as Element).getAttribute('name'),
    };

    const visualisation = Array.from(
      xmlDoc.getElementsByTagName('bpmndi:BPMNShape'),
    )
      .filter((e) => e.getAttribute('bpmnElement') === id)
      .pop() as Element;
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
    const elementType = getElementType(selection as BpmnSelection);

    switch (elementType) {
      case 'event':
        actions.undoEventData(getElementId(selection as BpmnSelection));
        break;
      case 'task':
        actions.undoTaskData(getElementId(selection as BpmnSelection));
        break;
      case 'gateway':
        actions.undoGateWayData(getElementId(selection as BpmnSelection));
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

  const isGateWay = gatewayElementTypes.includes((selection as BpmnSelection)?.type);

  return (
    <>
      <CustomElementDetails
        numberTemplates={numberTemplates}
        selectionId={(selection as BpmnSelection).businessObject.id}
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

interface ElementDetailsState {
  tasks: { actual: Record<string, unknown> };
  gateways: { actual: Record<string, unknown> };
  events: { actual: Record<string, unknown> };
}

const mapStateToProps = ({
  tasks: { actual: actualTaskList },
  gateways: { actual: actualGatewayList },
  events: { actual: actualEventList },
}: ElementDetailsState) => ({
  actualTaskList,
  actualGatewayList,
  actualEventList,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
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

export default connect(mapStateToProps, mapDispatchToProps)(ElementDetails as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
