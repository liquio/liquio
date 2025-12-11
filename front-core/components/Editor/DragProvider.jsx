import { useDndMonitor, useDroppable } from '@dnd-kit/core';
import { useCallback } from 'react';

const DragProviderHandler = ({ editor, children }) => {
  try {
    useDndMonitor({
      onDragMove: (event) => {
        const { over, active } = event;

        if (over) {
          const droppableRect = over.rect;
          const draggableRect = active.rect;

          const x =
            draggableRect.current.translated?.left -
            droppableRect.left +
            draggableRect.current.translated?.width;
          const y =
            draggableRect.current.translated?.top -
            droppableRect.top +
            draggableRect.current.translated?.height;

          if (editor) {
            editor.getDomNode().dispatchEvent(
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
            let data = active.data.current?.element?.data;

            try {
              data = JSON.parse(data);
            } catch (e) {
              // If parsing fails, keep data as is
            }

            if (data) {
              // find editor "cdr dnd-target" element
              const editorDomNode = editor.getDomNode();
              const dndTarget = editorDomNode.querySelector('.cdr.dnd-target');
              if (dndTarget) {
                const position = dndTarget.getBoundingClientRect();
                const x = position.left + position.width / 2;
                const y = position.top + position.height / 2;

                const target = editor.getTargetAtClientPoint(x, y);

                if (target) {
                  editor.executeEdits('', [
                    {
                      range: target.range,
                      text: data?.code || data || '',
                      forceMoveMarkers: true
                    }
                  ]);
                  editor.setPosition({
                    lineNumber: target.range.startLineNumber,
                    column: target.range.startColumn + (data.text ? data.text.length : 0)
                  });
                  editor.focus();
                  // Auto-format if enabled
                  if (editor.getOption(monaco.editor.EditorOption.formatOnType)) {
                    editor.getAction('editor.action.formatDocument').run();
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
    (event) => {
      event.preventDefault();

      const { dataTransfer } = event;
      if (!editor || !dataTransfer) {
        return;
      }

      const appendText = (text) => {
        const position = editor.getPosition();
        editor.executeEdits('', [
          {
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column
            ),
            text: text,
            forceMoveMarkers: true
          }
        ]);
        editor.setPosition({
          lineNumber: position.lineNumber,
          column: position.column + text.length
        });
        editor.focus();

        // Auto-format if enabled
        if (editor.getOption(monaco.editor.EditorOption.formatOnType)) {
          editor.getAction('editor.action.formatDocument').run();
        }
      };

      if (dataTransfer.files.length) {
        const file = dataTransfer.files[0];
        const reader = new FileReader();
        reader.onload = (e) => appendText(e.target.result);
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

export const DragProvider = ({ editor, children }) => {
  return <DragProviderHandler editor={editor}>{children}</DragProviderHandler>;
};
