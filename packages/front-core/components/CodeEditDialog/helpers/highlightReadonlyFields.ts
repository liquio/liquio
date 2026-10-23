import objectPath from 'object-path';
import paths from 'deepdash/paths';

interface AceEditorInstance {
  editor?: {
    session: {
      doc: { getAllLines: () => string[] };
    };
    getValue: () => string;
    getSession: () => { setAnnotations: (markers: unknown[]) => void };
  };
}

const highlightReadonlyFields = (t: (key: string) => string, editorInstance: AceEditorInstance | null | undefined) => {
  try {
    setTimeout(() => {
      const editor = editorInstance?.editor;

      if (!editor) return;

      const lines = editor.session.doc.getAllLines();

      let controlSchema: Record<string, unknown> = {};

      try {
        controlSchema = JSON.parse(editor.getValue());
      } catch {
        controlSchema = {};
      }

      const propertiesPaths = paths(controlSchema);

      const needWarning = propertiesPaths
        .map((path) => {
          const controlPath = path.split('.').filter((_, i) => i < path.split('.').length - 1);
          const control = objectPath.get(controlSchema, controlPath) as { value?: unknown; readOnly?: boolean } | undefined;

          if ((String(control?.value) + '').indexOf('user.') !== -1 && !control?.readOnly) {
            return controlPath.pop();
          }

          return null;
        })
        .filter(Boolean);

      const warnings = [...new Set(needWarning)];

      const markers = lines
        .map((line, rowIndex) => {
          const match = warnings
            .map((warning) => {
              return (line || '').trim() === `"${warning}": {`;
            })
            .filter(Boolean).length;

          if (!match) {
            return null;
          }

          return {
            row: rowIndex,
            column: 0,
            text: t('SetReadOnlyRecommendation'),
            type: 'warning'
          };
        })
        .filter(Boolean);

      if (!markers.length) return;

      editor.getSession().setAnnotations(markers);
    }, 100);
  } catch (e) {
    console.log('e =>', e);
  }
};

export default highlightReadonlyFields;
