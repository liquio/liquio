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

const isEmpty = (obj: unknown): boolean => Object.keys(obj as Record<string, unknown>).length === 0;

const range = (start: number, end: number): number[] => {
  const array: number[] = [];
  const inc = end - start > 0;
  for (let i = start; inc ? i <= end : i >= end; inc ? i++ : i--) {
    inc ? array.push(i) : array.unshift(i);
  }
  return array;
};

const defaultParsePaste = (str: string): string[][] => {
  return str.split(/\r\n|\n|\r/).map((row) => row.split('\t'));
};

interface DataSheetLocation {
  i: number;
  j: number;
}

interface DataSheetInternalState {
  start?: DataSheetLocation;
  end?: DataSheetLocation;
  selecting?: boolean;
  forceEdit?: boolean;
  editing?: Record<string, unknown>;
  clear?: Record<string, unknown>;
  virtualizeRef?: { averageRowHeight?: number } | Record<string, never>;
  copyValue?: unknown;
  editValue?: string;
  [key: string]: unknown;
}

type DataSheetProps = Record<string, unknown>;

interface DataSheetInstance extends React.Component<DataSheetProps, DataSheetInternalState> {
  dgDom: HTMLElement | null;
  editing: boolean;
  unsubscribe: () => void;
  updateRefTimeout?: ReturnType<typeof setTimeout>;
  defaultState: DataSheetInternalState;
  _setState(state: Partial<DataSheetInternalState>): void;
  getState(): { start: DataSheetLocation; end: DataSheetLocation };
  handleKey(e: KeyboardEvent): void;
  handleCut(e: ClipboardEvent): void;
  handleIEClipboardEvents(e: KeyboardEvent): void;
  handleEdit(e: unknown): void;
  handleKeyboardCellMovement(e: unknown): void;
  onDoubleClick(i: number, j: number): void;
  onContextMenu(e: unknown, cell: unknown, i: number, j: number): void;
  onRevert(): void;
  isEditing(i: number, j: number): boolean;
  isSelected(i: number, j: number): boolean;
  isClearing(i: number, j: number): boolean;
  removeAllListeners(): void;
  onMouseOver(i: number, j: number): void;
  onMouseUp(): void;
}

const ReactDataSheetAny = ReactDataSheet as unknown as new (
  props: DataSheetProps,
) => DataSheetInstance;

class DataSheet extends ReactDataSheetAny {
  _setState(state: Partial<DataSheetInternalState>) {
    const oldState = JSON.parse(JSON.stringify(this.state));
    super._setState(state);
    setTimeout(() => this.scrollToSelected(), 100);
    if (state.start && state.end) {
      this.checkRowBlur(state, oldState);
    }
  }

  checkRowBlur = (
    state: Partial<DataSheetInternalState>,
    oldState: DataSheetInternalState,
  ) => {
    const { start: { i: startI } = {}, end: { i: endI } = {} } = state;
    const { start: { i: oldStartI } = {}, end: { i: oldEndI } = {} } = oldState;
    const { onRowBlur } = this.props as { onRowBlur?: (startI: number, endI: number, cb: () => void) => void };

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

    onRowBlur(...([oldStartI, oldEndI].sort((a, b) => a - b) as [number, number]), this.setFocusToSelected);
  };

  pageClick(e: MouseEvent) {
    const { editing } = this.state;
    const isEditing = !isEmpty(editing);

    const element = this.dgDom;
    if (element && !element.contains(e.target as Node) && !isEditing) {
      this._setState(this.defaultState);
      this.removeAllListeners();
    }
  }

  handleFinishEditing = (r: number, c: number, nw: unknown) => {
    (this as unknown as { onChange: (r: number, c: number, nw: unknown) => void }).onChange(r, c, nw);
    this.setState({ editValue: '' });
    this.editing = false;
    setTimeout(() => this.setFocusToSelected(), 100);
  };

  setFocusToSelected = () => {
    const activCell = this.dgDom && (this.dgDom.querySelector('td.selected') as HTMLElement | null);
    if (!activCell) return;
    activCell.focus();
    this.scrollToSelected();
  };

  handleKey(e: KeyboardEvent) {
    const { undo, redo } = this.props as { undo?: () => void; redo?: () => void };
    const { editing } = this.state;

    super.handleKey(e);

    const ctrlKeyPressed = e.ctrlKey || e.metaKey;
    const keyCode = (e as unknown as { which?: number }).which || e.keyCode;

    if (undo && ctrlKeyPressed && keyCode === 90) {
      undo();
    }

    if (redo && ctrlKeyPressed && keyCode === 89) {
      redo();
    }

    if (keyCode === 13) {
      const activCell = this.dgDom!.querySelector('td.selected');

      if (activCell) return;

      const i = Number(document.activeElement!.getAttribute('row'));
      const j = Number(document.activeElement!.getAttribute('col'));

      if (Object.keys(editing || {}).length) return;

      this.onDoubleClick(i, j);
    }
  }

  handleCopy(e: ClipboardEvent) {
    if (isEmpty(this.state.editing)) {
      e.preventDefault();
      const { dataRenderer, valueRenderer, data } = this.props as {
        dataRenderer?: (cell: unknown, i: number, j: number) => unknown;
        valueRenderer: (cell: unknown, i: number, j: number) => unknown;
        data: Record<string, unknown>[][];
      };
      const { start, end } = this.getState();

      const handleCopyProp = (this.props as { handleCopy?: (args: unknown) => void }).handleCopy;

      if (handleCopyProp) {
        handleCopyProp({
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
        if ((window as unknown as { clipboardData?: DataTransfer }).clipboardData?.setData) {
          (window as unknown as { clipboardData: DataTransfer }).clipboardData.setData('Text', text as string);
        } else {
          e.clipboardData!.setData('text/plain', text as string);
        }
      }
    }
  }

  onMouseDown(i: number, j: number, e: MouseEvent) {
    const isNowEditingSameCell =
      !isEmpty(this.state.editing) && this.state.editing!.i === i && this.state.editing!.j === j;

    const editing =
      isEmpty(this.state.editing) || this.state.editing!.i !== i || this.state.editing!.j !== j
        ? {}
        : this.state.editing;

    if (!isNowEditingSameCell) {
      this._setState({
        selecting: !isNowEditingSameCell,
        start: (e as unknown as { shiftKey: boolean }).shiftKey ? this.state.start : { i, j },
        end: { i, j },
        editing: editing,
        forceEdit: !!isNowEditingSameCell
      });
    }

    const ua = window.navigator.userAgent;
    const isIE = /MSIE|Trident/.test(ua);
    // Listen for Ctrl + V in case of IE
    if (isIE) {
      document.addEventListener('keydown', this.handleIEClipboardEvents as EventListener);
    }

    // Keep listening to mouse if user releases the mouse (dragging outside)
    document.addEventListener('mouseup', this.onMouseUp as EventListener);
    // Listen for any outside mouse clicks
    document.addEventListener('mousedown', this.pageClick as EventListener);

    // Cut, copy and paste event handlers
    document.addEventListener('cut', this.handleCut as EventListener);
    document.addEventListener('copy', this.handleCopy as EventListener);
    document.addEventListener('paste', this.handlePaste as EventListener);

    const target = e.target as HTMLElement;
    const datarole = target.getAttribute('datarole');
    const datavalue = target.getAttribute('datavalue');

    if (datarole === 'copier') {
      this.setState({ copyValue: datavalue });
    }
  }

  handlePaste(e: ClipboardEvent) {
    if (isEmpty(this.state.editing)) {
      let { start, end } = this.getState();

      start = { i: Math.min(start.i, end.i), j: Math.min(start.j, end.j) };
      end = { i: Math.max(start.i, end.i), j: Math.max(start.j, end.j) };

      const parse = (this.props as { parsePaste?: (str: string, opts: unknown) => string[][] }).parsePaste || defaultParsePaste;
      const changes: Record<string, unknown>[] = [];
      let pasteData: string[][] = [];
      let pastedData;
      if ((window as unknown as { clipboardData?: DataTransfer }).clipboardData?.getData) {
        // IE
        pasteData = parse((window as unknown as { clipboardData: DataTransfer }).clipboardData.getData('Text'), { start, end });
      } else if (e.clipboardData && e.clipboardData.getData) {
        const types = e.clipboardData.types;
        if (
          (types instanceof DOMStringList && types.contains('text/html')) ||
          ((types as unknown as string[]).indexOf && (types as unknown as string[]).indexOf('text/html') !== -1)
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
      const { data, onCellsChanged, onPaste, onChange } = this.props as {
        data: Record<string, unknown>[][];
        onCellsChanged?: (changes: unknown[], additions?: unknown[]) => void;
        onPaste?: (changes: unknown[]) => void;
        onChange?: (cell: unknown, i: number, j: number, value: string) => void;
      };
      if (onCellsChanged) {
        const additions: Record<string, unknown>[] = [];
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
          const rowData: Record<string, unknown>[] = [];
          row.forEach((pastedData, j) => {
            end = { i: start.i + i, j: start.j + j };
            const cell = data[end.i] && data[end.i][end.j];
            rowData.push({ cell: cell, data: pastedData });
          });
          changes.push(...rowData);
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

  onMouseOver(i: number, j: number) {
    super.onMouseOver(i, j);
    if (this.state.selecting && isEmpty(this.state.editing)) {
      const selected = this.dgDom!.querySelector('tbody td.selected') as HTMLElement | null;
      selected && selected.focus();
    }
  }

  onMouseUp() {
    super.onMouseUp();

    const { onCellsChanged, data } = this.props as {
      onCellsChanged?: (changes: unknown[]) => void;
      data: Record<string, unknown>[][];
    };
    const { start, end, copyValue } = this.state;

    if (!copyValue) {
      return;
    }

    const changes: Record<string, unknown>[] = [];
    range(start!.i, end!.i).forEach((row) => {
      range(start!.j, end!.j).forEach((col) => {
        if (data[row] && data[row][col]) {
          changes.push({ cell: data[row][col], row, col, value: copyValue });
        }
      });
    });

    if (changes.length) {
      onCellsChanged!(changes);
    }

    this.setState({ copyValue: null });
  }

  scrollToSelected = () => {
    if (!this.dgDom) return;

    const cellElem = this.dgDom.querySelector('tbody td.selected') as HTMLElement | null;

    if (!cellElem) return;

    const { scrollRef } = this.props as { scrollRef: React.RefObject<HTMLElement> };

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

  renderCell = (i: number) => (cell: Record<string, unknown>, j: number) => {
    const {
      cellRenderer,
      dataRenderer,
      valueRenderer,
      dataEditor,
      valueViewer,
      attributesRenderer,
      readOnly
    } = this.props as Record<string, unknown>;

    const { forceEdit } = this.state;

    const isEditing = this.isEditing(i, j);
    const selected = this.isSelected(i, j);

    this.setFocusToSelected();

    return (
      <DataCell
        {...({
          key: cell.key ? cell.key : `${i}-${j}`,
          row: i,
          col: j,
          cell,
          forceEdit,
          onMouseDown: this.onMouseDown,
          onMouseOver: this.onMouseOver,
          onDoubleClick: this.onDoubleClick,
          onContextMenu: this.onContextMenu,
          onChange: this.handleFinishEditing,
          onRevert: this.onRevert,
          onNavigate: (this as unknown as { handleKeyboardCellMovement: unknown }).handleKeyboardCellMovement,
          onKey: this.handleKey,
          selected,
          editing: isEditing && !readOnly,
          clearing: this.isClearing(i, j),
          attributesRenderer,
          cellRenderer,
          valueRenderer,
          dataRenderer,
          valueViewer,
          dataEditor,
          editValue: this.state.editValue,
          ...(isEditing
            ? {
                onEdit: (e: unknown) => {
                  this.editing = true;
                  this.handleEdit(e);
                }
              }
            : {})
        } as unknown as Record<string, unknown>)}
      />
    );
  };

  renderRow = (row: Record<string, unknown>[], i: number) => {
    const { rowRenderer: RowRenderer, keyFn } = this.props as {
      rowRenderer: React.ComponentType<Record<string, unknown>>;
      keyFn?: (i: number) => string | number;
    };

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
    } = this.props as {
      sheetRenderer: React.ComponentType<Record<string, unknown>>;
      fixedRowHeight?: number;
      className?: string;
      overflow?: string;
      data: Record<string, unknown>[][];
      height: number | string;
      headerRef: React.RefObject<HTMLElement>;
      dataListRef: React.RefObject<HTMLElement>;
      jumpTo?: unknown;
      setJumpTo?: (value: null) => void;
    };

    const { selecting, editing, virtualizeRef = {}, end } = this.state;

    const dataListHeight = dataListRef && dataListRef.current && dataListRef.current.clientHeight;
    const headerHeight = headerRef.current && headerRef.current.clientHeight;

    return (
      <DataSheetContainer
        headerHeight={headerHeight as number}
        virtualizeRef={virtualizeRef}
        dataListHeight={dataListHeight as number}
        height={height}
        data={data}
      >
        <AutoSizer disableWidth={true}>
          {({ height: contentHeight }) => (
            <Virtualized
              {...({
                selected: end,
                fixedRowHeight,
                setFocusToSelected: () => setTimeout(() => this.setFocusToSelected(), 100),
                data,
                jumpTo,
                setJumpTo,
                virtualizeRef: (ref: unknown) => {
                  if (diff(virtualizeRef, ref)) {
                    clearTimeout(this.updateRefTimeout);
                    this.updateRefTimeout = setTimeout(() => {
                      this.setState({ virtualizeRef: ref as Record<string, never> });
                    }, 50);
                  }
                },
                headerHeight,
                dataListHeight,
                dataListRef,
                height: contentHeight,
                selecting: selecting && isEmpty(editing)
              } as unknown as Record<string, unknown>)}
            >
              <span
                ref={(r: HTMLSpanElement | null) => {
                  this.dgDom = r;
                }}
                tabIndex={0}
                className="data-grid-container"
                onKeyDown={this.handleKey as unknown as React.KeyboardEventHandler}
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
