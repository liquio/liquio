import React from 'react';
import ReactResizeDetector from 'react-resize-detector';
import { DataSheetGrid, keyColumn, textColumn } from 'react-datasheet-grid';

import EmptyPage from 'components/EmptyPage';

import 'react-datasheet-grid/dist/style.css';

const ReportTableViewer = ({ reportData: [, { fields, rows } = {}] = [] }) => {
  const [height, setHeigh] = React.useState();
  const containerRef = React.useRef();
  const columns = React.useMemo(
    () =>
      Array.isArray(fields) &&
      fields.map(({ name }) => ({
        ...keyColumn(name, textColumn),
        title: name,
      })),
    [fields],
  );

  const onResize = React.useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    setHeigh(containerRef.current.clientHeight);
  }, []);

  if (!columns || !Array.isArray(rows)) {
    return <EmptyPage title="Звіт не містить даних" description="" />;
  }

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%' }}>
      <DataSheetGrid
        lockRows={true}
        value={rows}
        columns={columns}
        height={height}
        disableExpandSelection={true}
      />
      <ReactResizeDetector handleHeight={true} onResize={onResize} />
    </div>
  );
};

export default ReportTableViewer;
