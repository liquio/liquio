import React from 'react';
import diff from 'helpers/diff';
import ReactDataSheet from 'react-datasheet';
import 'react-datasheet/lib/react-datasheet.css';
import DataCell from 'react-datasheet/lib/DataCell';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';

import VirtualizedData from 'components/Virtualized/VirtualizedData';
import Virtualized from 'components/Virtualized';
import store from 'store';
import parseTableData from 'helpers/parseTableData';
import DataSheetContainer from './DataSheetContainer';

const isEmpty = (obj) => Object.keys(obj).length === 0;

const range = (start, end) => {
  const array = [];
  const inc = end - start > 0;
  for (let i = start; inc ? i <= end : i >= end; inc ? i++ : i--) {
    inc ? array.push(i) : array.unshift(i);
  }
  return array;
};

const defaultParsePaste = (str) => {
  return str.split(/\r\n|\n|\r/).map((row) => row.split('\t'));
};

class DataSheet extends ReactDataSheet {
  _setState(state) {
    const oldState = JSON.parse(JSON.stringify(this.state));
    super._setState(state);
    setTimeout(() => this.scrollToSelected(), 100);
    if (state.start && state.end) {
      this.checkRowBlur(state, oldState);
    }
  }

  checkRowBlur = (
    { start: { i: startI } = {}, end: { i: endI } = {} },
    { start: { i: oldStartI } = {}, end: { i: oldEndI } = {} }
  ) => {
    const { onRowBlur } = this.props;

    if (!onRowBlur || typeof onRowBlur !== 'function') {
      return;
    }

    if (
      oldStartI === undefined ||
      oldEndI === undefined ||
      startI === oldStartI ||
      endI === oldEndI
    ) {
      return;
    }

    onRowBlur(...[oldStartI, oldEndI].sort((a, b) => a - b), this.setFocusToSelected);
  };

  pageClick(e) {
    const { editing } = this.state;
    const isEditing = !isEmpty(editing);

    const element = this.dgDom;
    if (element && !element.contains(e.target) && !isEditing) {
      this._setState(this.defaultState);
      this.removeAllListeners();
    }
  }

  handleFinishEditing = (r, c, nw) => {
    this.onChange(r, c, nw);
    this.setState({ editValue: '' });
    this.editing = false;
    setTimeout(() => this.setFocusToSelected(), 100);
  };

  setFocusToSelected = () => {
    const activCell = this.dgDom && this.dgDom.querySelector('td.selected');
    if (!activCell) return;
    activCell.focus();
    this.scrollToSelected();
  };

  handleKey(e) {
    const { undo, redo } = this.props;
    const { editing } = this.state;

    super.handleKey(e);

    const ctrlKeyPressed = e.ctrlKey || e.metaKey;
    const keyCode = e.which || e.keyCode;

    if (undo && ctrlKeyPressed && keyCode === 90) {
      undo();
    }

    if (redo && ctrlKeyPressed && keyCode === 89) {
      redo();
    }

    if (keyCode === 13) {
      const activCell = this.dgDom.querySelector('td.selected');

      if (activCell) return;

      const i = Number(document.activeElement.getAttribute('row'));
      const j = Number(document.activeElement.getAttribute('col'));

      if (Object.keys(editing).length) return;

      this.onDoubleClick(i, j);
    }
  }

  handleCopy(e) {
    if (isEmpty(this.state.editing)) {
      e.preventDefault();
      const { dataRenderer, valueRenderer, data } = this.props;
      const { start, end } = this.getState();

      if (this.props.handleCopy) {
        this.props.handleCopy({
          event: e,
          dataRenderer,
          valueRenderer,
          data,
          start,
          end,
          range
        });
      } else {
        const text = range(start.i, end.i)
          .map((i) =>
            range(start.j, end.j)
              .map((j) => {
                const cell = data[i][j];
                if (typeof cell.value === 'object') {
                  return JSON.stringify(cell.value);
                }
                const value = dataRenderer ? dataRenderer(cell, i, j) : null;
                if (value === '' || value === null || typeof value === 'undefined') {
                  return valueRenderer(cell, i, j);
                }
                return value;
              })
              .join('\t')
          )
          .join('\n');
        if (window.clipboardData && window.clipboardData.setData) {
          window.clipboardData.setData('Text', text);
        } else {
          e.clipboardData.setData('text/plain', text);
        }
      }
    }
  }

  onMouseDown(i, j, e) {
    const isNowEditingSameCell =
      !isEmpty(this.state.editing) && this.state.editing.i === i && this.state.editing.j === j;

    let editing =
      isEmpty(this.state.editing) || this.state.editing.i !== i || this.state.editing.j !== j
        ? {}
        : this.state.editing;

    if (!isNowEditingSameCell) {
      this._setState({
        selecting: !isNowEditingSameCell,
        start: e.shiftKey ? this.state.start : { i, j },
        end: { i, j },
        editing: editing,
        forceEdit: !!isNowEditingSameCell
      });
    }

    var ua = window.navigator.userAgent;
    var isIE = /MSIE|Trident/.test(ua);
    // Listen for Ctrl + V in case of IE
    if (isIE) {
      document.addEventListener('keydown', this.handleIEClipboardEvents);
    }

    // Keep listening to mouse if user releases the mouse (dragging outside)
    document.addEventListener('mouseup', this.onMouseUp);
    // Listen for any outside mouse clicks
    document.addEventListener('mousedown', this.pageClick);

    // Cut, copy and paste event handlers
    document.addEventListener('cut', this.handleCut);
    document.addEventListener('copy', this.handleCopy);
    document.addEventListener('paste', this.handlePaste);

    const datarole = e.target.getAttribute('datarole');
    const datavalue = e.target.getAttribute('datavalue');

    if (datarole === 'copier') {
      this.setState({ copyValue: datavalue });
    }
  }

  handlePaste(e) {
    if (isEmpty(this.state.editing)) {
      let { start, end } = this.getState();

      start = { i: Math.min(start.i, end.i), j: Math.min(start.j, end.j) };
      end = { i: Math.max(start.i, end.i), j: Math.max(start.j, end.j) };

      const parse = this.props.parsePaste || defaultParsePaste;
      const changes = [];
      let pasteData = [],
        pastedData;
      if (window.clipboardData && window.clipboardData.getData) {
        // IE
        pasteData = parse(window.clipboardData.getData('Text'), { start, end });
      } else if (e.clipboardData && e.clipboardData.getData) {
        const types = e.clipboardData.types;
        if (
          (types instanceof DOMStringList && types.contains('text/html')) ||
          (types.indexOf && types.indexOf('text/html') !== -1)
        ) {
          pastedData = e.clipboardData.getData('text/html');
          const tableData = parseTableData(pastedData);
          pasteData = parse(tableData.map((cells) => cells.join('\t')).join('\n'), { start, end });
        } else {
          pasteData = parse(e.clipboardData.getData('text/plain'), {
            start,
            end
          });
        }
      }

      // in order of preference
      const { data, onCellsChanged, onPaste, onChange } = this.props;
      if (onCellsChanged) {
        const additions = [];
        pasteData.forEach((row, i) => {
          row.forEach((value, j) => {
            end = { i: start.i + i, j: start.j + j };
            const cell = data[end.i] && data[end.i][end.j];
            if (!cell) {
              additions.push({ row: end.i, col: end.j, value });
            } else if (!cell.readOnly) {
              let newValue;
              try {
                newValue = JSON.parse(value);
                if (Array.isArray(newValue)) {
                  newValue = JSON.parse(value);
                } else {
                  newValue = value;
                }
              } catch (e) {
                newValue = value;
              }
              changes.push({ cell, row: end.i, col: end.j, value: newValue });
            }
          });
        });
        if (additions.length) {
          onCellsChanged(changes, additions);
        } else {
          onCellsChanged(changes);
        }
      } else if (onPaste) {
        pasteData.forEach((row, i) => {
          const rowData = [];
          row.forEach((pastedData, j) => {
            end = { i: start.i + i, j: start.j + j };
            const cell = data[end.i] && data[end.i][end.j];
            rowData.push({ cell: cell, data: pastedData });
          });
          changes.push(rowData);
        });
        onPaste(changes);
      } else if (onChange) {
        pasteData.forEach((row, i) => {
          row.forEach((value, j) => {
            end = { i: start.i + i, j: start.j + j };
            const cell = data[end.i] && data[end.i][end.j];
            if (cell && !cell.readOnly) {
              onChange(cell, end.i, end.j, value);
            }
          });
        });
      }
      this._setState({ end });
    }
  }

  onMouseOver(i, j) {
    super.onMouseOver(i, j);
    if (this.state.selecting && isEmpty(this.state.editing)) {
      const selected = this.dgDom.querySelector('tbody td.selected');
      selected && selected.focus();
    }
  }

  onMouseUp() {
    super.onMouseUp();

    const { onCellsChanged, data } = this.props;
    const { start, end, copyValue } = this.state;

    if (!copyValue) {
      return;
    }

    const changes = [];
    range(start.i, end.i).forEach((row) => {
      range(start.j, end.j).forEach((col) => {
        if (data[row] && data[row][col]) {
          changes.push({ cell: data[row][col], row, col, value: copyValue });
        }
      });
    });

    if (changes.length) {
      onCellsChanged(changes);
    }

    this.setState({ copyValue: null });
  }

  scrollToSelected = () => {
    if (!this.dgDom) return;

    const cellElem = this.dgDom.querySelector('tbody td.selected');

    if (!cellElem) return;

    const { scrollRef } = this.props;

    if (!scrollRef.current) return;

    const scrollContainer = scrollRef.current;

    if (cellElem.offsetLeft < scrollContainer.scrollLeft) {
      scrollContainer.scrollLeft = cellElem.offsetLeft;
      return;
    }

    if (
      cellElem.offsetLeft + cellElem.clientWidth >
      scrollContainer.clientWidth + scrollContainer.scrollLeft
    ) {
      scrollContainer.scrollLeft =
        cellElem.offsetLeft +
        cellElem.clientWidth -
        scrollContainer.clientWidth +
        scrollContainer.scrollLeft +
        2;
    }
  };

  componentDidMount = () => {
    this.unsubscribe = store.subscribe(this.setFocusToSelected);
  };

  componentWillUnmount = () => this.unsubscribe();

  renderCell = (i) => (cell, j) => {
    const {
      cellRenderer,
      dataRenderer,
      valueRenderer,
      dataEditor,
      valueViewer,
      attributesRenderer,
      readOnly
    } = this.props;

    const { forceEdit } = this.state;

    const isEditing = this.isEditing(i, j);
    const selected = this.isSelected(i, j);

    this.setFocusToSelected();

    return (
      <DataCell
        key={cell.key ? cell.key : `${i}-${j}`}
        row={i}
        col={j}
        cell={cell}
        forceEdit={forceEdit}
        onMouseDown={this.onMouseDown}
        onMouseOver={this.onMouseOver}
        onDoubleClick={this.onDoubleClick}
        onContextMenu={this.onContextMenu}
        onChange={this.handleFinishEditing}
        onRevert={this.onRevert}
        onNavigate={this.handleKeyboardCellMovement}
        onKey={this.handleKey}
        selected={selected}
        editing={isEditing && !readOnly}
        clearing={this.isClearing(i, j)}
        attributesRenderer={attributesRenderer}
        cellRenderer={cellRenderer}
        valueRenderer={valueRenderer}
        dataRenderer={dataRenderer}
        valueViewer={valueViewer}
        dataEditor={dataEditor}
        editValue={this.state.editValue}
        {...(isEditing
          ? {
              onEdit: (e) => {
                this.editing = true;
                this.handleEdit(e);
              }
            }
          : {})}
      />
    );
  };

  renderRow = (row, i) => {
    const { rowRenderer: RowRenderer, keyFn } = this.props;

    return (
      <RowRenderer key={keyFn ? keyFn(i) : i} row={i} cells={row}>
        {row.map(this.renderCell(i))}
      </RowRenderer>
    );
  };

  render() {
    const {
      sheetRenderer: SheetRenderer,
      fixedRowHeight,
      className,
      overflow,
      data,
      height,
      headerRef,
      dataListRef,
      jumpTo,
      setJumpTo
    } = this.props;

    const { selecting, editing, virtualizeRef = {}, end } = this.state;

    const dataListHeight = dataListRef && dataListRef.current && dataListRef.current.clientHeight;
    const headerHeight = headerRef.current && headerRef.current.clientHeight;

    return (
      <DataSheetContainer
        headerHeight={headerHeight}
        virtualizeRef={virtualizeRef}
        dataListHeight={dataListHeight}
        height={height}
        data={data}
      >
        <AutoSizer disableWidth={true}>
          {({ height: contentHeight }) => (
            <Virtualized
              selected={end}
              fixedRowHeight={fixedRowHeight}
              setFocusToSelected={() => setTimeout(() => this.setFocusToSelected(), 100)}
              data={data}
              jumpTo={jumpTo}
              setJumpTo={setJumpTo}
              virtualizeRef={(ref) => {
                if (diff(virtualizeRef, ref)) {
                  clearTimeout(this.updateRefTimeout);
                  this.updateRefTimeout = setTimeout(() => {
                    this.setState({ virtualizeRef: ref });
                  }, 50);
                }
              }}
              headerHeight={headerHeight}
              dataListHeight={dataListHeight}
              dataListRef={dataListRef}
              height={contentHeight}
              selecting={selecting && isEmpty(editing)}
            >
              <span
                ref={(r) => {
                  this.dgDom = r;
                }}
                tabIndex="0"
                className="data-grid-container"
                onKeyDown={this.handleKey}
              >
                <SheetRenderer
                  data={data}
                  editing={editing}
                  selecting={selecting && isEmpty(editing)}
                  virtualizeRef={virtualizeRef}
                  className={['data-grid', className, overflow].filter((a) => a).join(' ')}
                >
                  <VirtualizedData rowRenderer={this.renderRow} />
                </SheetRenderer>
              </span>
            </Virtualized>
          )}
        </AutoSizer>
      </DataSheetContainer>
    );
  }
}

export default DataSheet;
