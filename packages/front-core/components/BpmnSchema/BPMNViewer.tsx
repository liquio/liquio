import React from 'react';
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import withStyles from '@mui/styles/withStyles';

import Statuses from './modules/Statuses';

const dotSize = 16;

const styles = {
  root: {
    height: '100%'
  },
  overlay: {
    width: dotSize,
    height: dotSize,
    backgroundColor: 'green',
    borderRadius: dotSize,
    '& .details': {
      display: 'none',
      whiteSpace: 'nowrap'
    },
    '&:hover': {
      width: 'auto',
      height: 'auto',
      padding: '4px 8px',
      backgroundColor: '#ffffff',
      border: 'green 1px solid',
      borderRadius: 5,
      zIndex: 10,
      '& .details': {
        display: 'block'
      }
    }
  },
  errorOverlay: {
    backgroundColor: 'red',
    '&:hover': {
      border: 'red 1px solid'
    }
  }
};

interface Viewbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BPMNViewerProps {
  classes: Record<string, string>;
  schema: string;
  data?: unknown[];
  viewbox?: Viewbox;
  viewboxChange?: (viewbox: Viewbox) => void;
}

const BPMNViewer = ({ classes, schema, data, viewbox, viewboxChange }: BPMNViewerProps) => {
  const [viewer, setViewer] = React.useState<BpmnViewer | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const canvas = viewer?.get('canvas') as { viewbox: (box?: Viewbox) => Viewbox } | undefined;
    if (!viewbox || !canvas) return;

    const oldViewbox = canvas.viewbox();

    if (
      oldViewbox.x === viewbox.x &&
      oldViewbox.y === viewbox.y &&
      oldViewbox.width === viewbox.width &&
      oldViewbox.height === viewbox.height
    ) {
      return;
    }

    canvas.viewbox(viewbox);
  }, [viewbox, viewer]);

  React.useEffect(() => {
    const canvas = viewer?.get('canvas');
    const masterEventBus = viewer?.get('eventBus') as { on: (event: string, handler: (e: { viewbox: Viewbox }) => void) => void; off: (event: string) => void } | undefined;
    if (!canvas || !masterEventBus) return;

    masterEventBus.on('canvas.viewbox.changed', (e) => {
      const { viewbox } = e;
      if (viewboxChange) {
        viewboxChange(viewbox);
      }
    });

    return () => {
      if (canvas) {
        masterEventBus.off('canvas.viewbox.changed');
      }
    };
  }, [ref, viewboxChange, viewer]);

  React.useEffect(() => {
    if (!ref.current) return;

    const importSchema = async () => {
      let additionalModules = null;

      if (data) {
        additionalModules = [Statuses({ data: data as never, classes })];
      }

      const viewer = new BpmnViewer({
        container: ref.current,
        additionalModules
      });

      setViewer(viewer);
      await viewer.importXML(schema);

      (viewer.get('canvas') as { zoom: (mode: string) => void }).zoom('fit-viewport');
    };

    importSchema();
  }, [ref, schema, data, classes]);

  return <div ref={ref} className={classes.root} />;
};

export default withStyles(styles)(BPMNViewer as never) as unknown as React.ComponentType<Record<string, unknown>>;
