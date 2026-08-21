import { EditorsLayout } from 'components/JsonSchema/editor/components/EditorsLayout';
import { CodeEditor } from '../editors/CodeEditor';
import { VisualEditor } from '../editors/VisualEditor';

export const EditorComponents = {
  visual: VisualEditor,
  code: CodeEditor
};

export const JsonSchemaEditor = ({
  mode = 'visual', // Default to visual mode
  ...props
}) => {
  const EditorComponent = EditorComponents[mode] || CodeEditor;

  return (
    <EditorsLayout>
      <EditorComponent {...props} />
    </EditorsLayout>
  );
};
