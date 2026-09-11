import React from 'react';
import { EditorsLayout } from 'components/JsonSchema/editor/components/EditorsLayout';
import { CodeEditor } from '../editors/CodeEditor';
import { VisualEditor } from '../editors/VisualEditor';

export type EditorMode = 'visual' | 'code';
type EditorProps = Record<string, unknown>;
type EditorComponent = React.ComponentType<EditorProps> & {
  Settings?: React.ComponentType;
};

export const EditorComponents: Record<
  EditorMode,
  EditorComponent
> = {
  visual: VisualEditor as unknown as EditorComponent,
  code: CodeEditor as unknown as EditorComponent,
};

interface JsonSchemaEditorProps extends EditorProps {
  mode?: EditorMode;
}

export const JsonSchemaEditor = ({
  mode = 'visual',
  ...props
}: JsonSchemaEditorProps) => {
  const EditorComponent = EditorComponents[mode] || EditorComponents.code;
  return (
    <EditorsLayout>
      <EditorComponent {...props} />
    </EditorsLayout>
  );
};
