import JSON5 from 'json5';
import { useEffect, useState } from 'react';

export interface EditorSchema {
  properties?: Record<string, EditorSchema>;
  [key: string]: unknown;
}

export const useSchema = (value: string, onChange?: (value: string) => void) => {
  const [currentPage, setCurrentPage] = useState<string | null>(null);
  const [schema, setSchema] = useState<EditorSchema>(() => {
    try {
      return (JSON5.parse(value) as EditorSchema) || {};
    } catch (error) {
      console.error('Invalid JSON schema:', error);
      return {};
    }
  });

  useEffect(() => {
    onChange?.(JSON.stringify(schema, null, 2));
  }, [schema, onChange]);

  useEffect(() => {
    if (!value) return;
    try {
      const parsedSchema = JSON5.parse(value) as EditorSchema;
      setSchema(parsedSchema);
      const pageNames = Object.keys(parsedSchema.properties || {});
      if (!currentPage && pageNames.length > 0) setCurrentPage(pageNames[0]);
    } catch (error) {
      console.error('Invalid JSON schema:', error);
    }
  }, [currentPage, value]);

  const handleChangePageSchema = (newSchema: EditorSchema) => {
    if (!currentPage) return;
    setSchema((previousSchema) => ({
      ...previousSchema,
      properties: { ...previousSchema.properties, [currentPage]: newSchema },
    }));
  };

  const currentPageSchema = currentPage ? schema.properties?.[currentPage] || {} : {};
  return { schema, handleChange: setSchema, currentPage, setCurrentPage, currentPageSchema, handleChangePageSchema };
};
