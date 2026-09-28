declare module '@ckeditor/ckeditor5-react' {
  import { ComponentType } from 'react';

  interface CKEditorInstance {
    getData(): string;
  }

  interface CKEditorProps {
    editor: unknown;
    data?: string;
    onChange?: (event: unknown, editor: CKEditorInstance) => void;
    [key: string]: unknown;
  }

  export const CKEditor: ComponentType<CKEditorProps>;
}
