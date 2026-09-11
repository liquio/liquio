import type { ComponentType } from 'react';
import CodePreview from './CodePreview';
import SchemaPreview from './SchemaPreview';

const previewTypes: Record<string, ComponentType<Record<string, unknown>>> = {
  json: CodePreview as unknown as ComponentType<Record<string, unknown>>,
  html: CodePreview as unknown as ComponentType<Record<string, unknown>>,
  schema: SchemaPreview as unknown as ComponentType<Record<string, unknown>>,
};

export default previewTypes;
