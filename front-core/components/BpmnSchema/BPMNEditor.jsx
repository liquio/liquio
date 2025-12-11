import React from 'react';
import PropTypes from 'prop-types';
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

class BPMNEditor extends React.Component {
  constructor(props) {
    super(props);
    this.containerRef = React.createRef();
    this.sizerRef = React.createRef();
    this.state = { ready: false };
  }

  bindHotkeys = () => {
    this.unBindHotkeys();
    hotkeys('ctrl+z, command+z', () => this.modeler && this.modeler.get('commandStack').undo());
    hotkeys(
      'ctrl+shift+z, command+shift+z',
      () => this.modeler && this.modeler.get('commandStack').redo()
    );
  };

  unBindHotkeys = () => {
    hotkeys.unbind('ctrl+z, command+z');
    hotkeys.unbind('ctrl+shift+z, command+shift+z');
  };

  onElementCreate = ({ element }) => {
    const { onElementCreate } = this.props;
    return onElementCreate && onElementCreate(element);
  };

  onElementDelete = ({ element }) => {
    const { onElementDelete } = this.props;
    return onElementDelete && onElementDelete(element);
  };

  onElementChange = ({ element }) => {
    const { onElementChange } = this.props;
    return onElementChange && onElementChange(element);
  };

  onElementSelect = ({ element }) => {
    const { onElementSelect } = this.props;
    return onElementSelect && onElementSelect(element);
  };

  getSchema = () =>
    new Promise((resolve) =>
      this.modeler.saveXML({ format: true }, (error, xmlBpmnSchema) => {
        if (error) {
          resolve(null);
          return;
        }
        resolve(xmlBpmnSchema);
      })
    );

  componentDidMount() {
    const { onError, onReady, onChange, diagram } = this.props;

    this.modeler = new BpmnModeler({ container: this.containerRef.current });

    this.modeler.on('import.done', ({ error }) => {
      if (error) {
        onError && onError(error);
      }
      onReady && onReady(this.modeler);
      this.setState({ ready: true });
    });

    this.modeler.on('commandStack.changed', async () => {
      const xmlBpmnSchema = await this.getSchema();
      onChange(xmlBpmnSchema);
    });

    if (diagram) {
      this.modeler.importXML(diagram, this.onActions);
    }

    // onReady && onReady(this.modeler);
  }

  onActions = () => {
    this.modeler.on('shape.added', this.onElementCreate);
    this.modeler.on('shape.removed', this.onElementDelete);
    this.modeler.on('element.changed', this.onElementChange);
    this.modeler.on('element.click', this.onElementSelect);
  };

  offActions = () => {
    this.modeler.off('shape.added', this.onElementCreate);
    this.modeler.off('shape.removed', this.onElementDelete);
    this.modeler.off('element.changed', this.onElementChange);
    this.modeler.off('element.click', this.onElementSelect);
  };

  componentDidUpdate = async ({ schemaId: oldSchemaId }) => {
    const { ready } = this.state;
    const { diagram, schemaId, blockHotkeys } = this.props;
    const xmlBpmnSchema = await this.getSchema();

    if (ready && diagram !== xmlBpmnSchema && oldSchemaId !== schemaId) {
      this.offActions();
      this.modeler.importXML(diagram, this.onActions);
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

BPMNEditor.propTypes = {
  classes: PropTypes.object.isRequired,
  diagram: PropTypes.string,
  onError: PropTypes.func,
  onReady: PropTypes.func,
  onChange: PropTypes.func,
  onElementCreate: PropTypes.func,
  onElementDelete: PropTypes.func,
  onElementChange: PropTypes.func,
  onElementSelect: PropTypes.func
};

BPMNEditor.defaultProps = {
  diagram: '',
  onError: () => null,
  onReady: () => null,
  onChange: () => null,
  onElementCreate: () => null,
  onElementDelete: () => null,
  onElementChange: () => null,
  onElementSelect: () => null
};

export default withStyles(styles)(BPMNEditor);
