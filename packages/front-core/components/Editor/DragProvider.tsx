import React, { useCallback } from 'react';
import { useDndMonitor, useDroppable } from '@dnd-kit/core';
import type { OnMount, Monaco } from '@monaco-editor/react';

// `monaco-editor`'s package.json "exports" map isn't resolved under this
// project's moduleResolution setting when imported directly, so types are
// derived from @monaco-editor/react's own exports instead.
type MonacoEditorInstance = Parameters<OnMount>[0];

// This file references a bare `monaco` global that is never imported here —
// a real pre-existing bug (confirmed: no import, no global declaration, no
// bundler ProvidePlugin anywhere in either app's vite config). If either
// code path below is actually reached (drag-move with format-on-type
// enabled, or dropping a file/text onto the editor), it throws
// `ReferenceError: monaco is not defined`. Preserved exactly rather than
// wiring up the (likely intended) `useMonaco()` import, per this
// migration's rule against silently fixing pre-existing behavior.
declare const monaco: Monaco;

interface DragProviderHandlerProps {
  editor: MonacoEditorInstance | null;
  children: React.ReactNode;
}

const DragProviderHandler = ({ editor, children }: DragProviderHandlerProps) => {
  try {
    useDndMonitor({
      onDragMove: (event) => {
        const { over, active } = event;

        if (over) {
          const droppableRect = over.rect;
          const draggableRect = active.rect;

          const x =
            (draggableRect.current.translated?.left as number) -
            droppableRect.left +
            (draggableRect.current.translated?.width as number);
          const y =
            (draggableRect.current.translated?.top as number) -
            droppableRect.top +
            (draggableRect.current.translated?.height as number);

          if (editor) {
            editor.getDomNode()?.dispatchEvent(
              new MouseEvent('dragover', {
                clientX: x,
                clientY: y,
                bubbles: true,
                cancelable: true
              })
            );
          }
        }
      },
      onDragEnd: (event) => {
        // insert the dropped content into the editor
        const { over, active } = event;
        if (over && active) {
          const droppableId = over.id;

          // Check if the drop zone is the editor
          if (droppableId === 'editor-drop-zone') {
            let data = (active.data.current as { element?: { data?: unknown } })?.element?.data as unknown;

            try {
              data = JSON.parse(data as string);
            } catch (e) {
              // If parsing fails, keep data as is
            }

            if (data) {
              // find editor "cdr dnd-target" element
              const editorDomNode = editor!.getDomNode();
              const dndTarget = editorDomNode?.querySelector('.cdr.dnd-target');
              if (dndTarget) {
                const position = dndTarget.getBoundingClientRect();
                const x = position.left + position.width / 2;
                const y = position.top + position.height / 2;

                const target = (editor as unknown as {
                  getTargetAtClientPoint: (
                    x: number,
                    y: number
                  ) => { range: { startLineNumber: number; startColumn: number } } | null;
                }).getTargetAtClientPoint(x, y);

                if (target) {
                  const dataObj = data as { code?: string; text?: string };
                  editor!.executeEdits('', [
                    {
                      range: target.range as never,
                      text: dataObj?.code || (data as string) || '',
                      forceMoveMarkers: true
                    }
                  ]);
                  editor!.setPosition({
                    lineNumber: target.range.startLineNumber,
                    column: target.range.startColumn + (dataObj.text ? dataObj.text.length : 0)
                  });
                  editor!.focus();
                  // Auto-format if enabled
                  if (editor!.getOption(monaco.editor.EditorOption.formatOnType)) {
                    editor!.getAction('editor.action.formatDocument')?.run();
                  }
                }
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error setting up DnD monitor:', error);
  }

  const { setNodeRef } = useDroppable({
    id: 'editor-drop-zone'
  });

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const { dataTransfer } = event;
      if (!editor || !dataTransfer) {
        return;
      }

      const appendText = (text: string) => {
        const position = editor.getPosition();
        editor.executeEdits('', [
          {
            range: new monaco.Range(
              position!.lineNumber,
              position!.column,
              position!.lineNumber,
              position!.column
            ),
            text: text,
            forceMoveMarkers: true
          }
        ]);
        editor.setPosition({
          lineNumber: position!.lineNumber,
          column: position!.column + text.length
        });
        editor.focus();

        // Auto-format if enabled
        if (editor.getOption(monaco.editor.EditorOption.formatOnType)) {
          editor.getAction('editor.action.formatDocument')?.run();
        }
      };

      if (dataTransfer.files.length) {
        const file = dataTransfer.files[0];
        const reader = new FileReader();
        reader.onload = (e) => appendText(e.target?.result as string);
        reader.readAsText(file);
      } else if (dataTransfer.getData('text/plain')) {
        appendText(dataTransfer.getData('text/plain'));
      }
    },
    [editor]
  );

  return (
    <div ref={setNodeRef} onDrop={handleDrop} style={{ height: '100%' }}>
      {children}
    </div>
  );
};

interface DragProviderProps {
  editor: MonacoEditorInstance | null;
  children: React.ReactNode;
}

export const DragProvider = ({ editor, children }: DragProviderProps) => {
  return <DragProviderHandler editor={editor}>{children}</DragProviderHandler>;
};
