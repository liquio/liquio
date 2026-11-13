import React from 'react';
import withStyles from '@mui/styles/withStyles';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import hotkeys from 'hotkeys-js';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-font/dist/css/bpmn-embedded.css';

const styles = {
  sizer: {
    height: '100%',
    background: '#DDDDDD'
  }
};

interface BpmnElement {
  id: string;
  [key: string]: unknown;
}

interface BPMNEditorProps {
  classes: Record<string, string>;
  id?: string;
  diagram?: string;
  schemaId?: string;
  blockHotkeys?: boolean;
  onError?: (error: Error) => void;
  onReady?: (modeler: BpmnModeler) => void;
  onChange?: (schema: string | null) => void;
  onElementCreate?: (element: BpmnElement) => void;
  onElementDelete?: (element: BpmnElement) => void;
  onElementChange?: (element: BpmnElement) => void;
  onElementSelect?: (element: BpmnElement) => void;
}

interface BPMNEditorState {
  ready: boolean;
  height?: number;
}

class BPMNEditor extends React.Component<BPMNEditorProps, BPMNEditorState> {
  static defaultProps = {
    diagram: '',
    onError: () => null,
    onReady: () => null,
    onChange: () => null,
    onElementCreate: () => null,
    onElementDelete: () => null,
    onElementChange: () => null,
    onElementSelect: () => null
  };

  containerRef: React.RefObject<HTMLDivElement | null>;
  sizerRef: React.RefObject<HTMLDivElement | null>;
  modeler?: BpmnModeler;

  constructor(props: BPMNEditorProps) {
    super(props);
    this.containerRef = React.createRef();
    this.sizerRef = React.createRef();
    this.state = { ready: false };
  }

  bindHotkeys = () => {
    this.unBindHotkeys();
    hotkeys('ctrl+z, command+z', () => this.modeler && (this.modeler.get('commandStack') as { undo: () => void }).undo());
    hotkeys(
      'ctrl+shift+z, command+shift+z',
      () => this.modeler && (this.modeler.get('commandStack') as { redo: () => void }).redo()
    );
  };

  unBindHotkeys = () => {
    hotkeys.unbind('ctrl+z, command+z');
    hotkeys.unbind('ctrl+shift+z, command+shift+z');
  };

  onElementCreate = ({ element }: { element: BpmnElement }) => {
    const { onElementCreate } = this.props;
    return onElementCreate && onElementCreate(element);
  };

  onElementDelete = ({ element }: { element: BpmnElement }) => {
    const { onElementDelete } = this.props;
    return onElementDelete && onElementDelete(element);
  };

  onElementChange = ({ element }: { element: BpmnElement }) => {
    const { onElementChange } = this.props;
    return onElementChange && onElementChange(element);
  };

  onElementSelect = ({ element }: { element: BpmnElement }) => {
    const { onElementSelect } = this.props;
    return onElementSelect && onElementSelect(element);
  };

  getSchema = (): Promise<string | null> =>
    new Promise((resolve) =>
      this.modeler!.saveXML({ format: true }, (error, xmlBpmnSchema) => {
        if (error) {
          resolve(null);
          return;
        }
        resolve(xmlBpmnSchema as string);
      })
    );

  componentDidMount() {
    const { onError, onReady, onChange, diagram } = this.props;

    this.modeler = new BpmnModeler({ container: this.containerRef.current });

    this.modeler.on('import.done', ({ error }: { error?: Error }) => {
      if (error) {
        onError && onError(error);
      }
      onReady && onReady(this.modeler as BpmnModeler);
      this.setState({ ready: true });
    });

    this.modeler.on('commandStack.changed', async () => {
      const xmlBpmnSchema = await this.getSchema();
      onChange!(xmlBpmnSchema);
    });

    if (diagram) {
      this.modeler.importXML(diagram, this.onActions as never);
    }

    // onReady && onReady(this.modeler);
  }

  onActions = () => {
    this.modeler!.on('shape.added', this.onElementCreate as never);
    this.modeler!.on('shape.removed', this.onElementDelete as never);
    this.modeler!.on('element.changed', this.onElementChange as never);
    this.modeler!.on('element.click', this.onElementSelect as never);
  };

  offActions = () => {
    this.modeler!.off('shape.added', this.onElementCreate as never);
    this.modeler!.off('shape.removed', this.onElementDelete as never);
    this.modeler!.off('element.changed', this.onElementChange as never);
    this.modeler!.off('element.click', this.onElementSelect as never);
  };

  componentDidUpdate = async ({ schemaId: oldSchemaId }: BPMNEditorProps) => {
    const { ready } = this.state;
    const { diagram, schemaId, blockHotkeys } = this.props;
    const xmlBpmnSchema = await this.getSchema();

    if (ready && diagram !== xmlBpmnSchema && oldSchemaId !== schemaId) {
      this.offActions();
      this.modeler!.importXML(diagram as string, this.onActions as never);
    }
    blockHotkeys ? this.unBindHotkeys() : this.bindHotkeys();
  };

  componentWillUnmount() {
    this.modeler && this.modeler.destroy();
  }

  render() {
    const { classes, id } = this.props;
    const { height } = this.state;

    return (
      <div
        ref={(ref) => {
          if (!ref || ref.offsetHeight === height) {
            return;
          }
          this.setState({ height: ref.offsetHeight });
        }}
        className={classes.sizer}
      >
        <div id={id} style={{ height }} ref={this.containerRef} />
      </div>
    );
  }
}

export default withStyles(styles)(BPMNEditor as never) as unknown as React.ComponentType<Record<string, unknown>>;
