import JSON5 from 'json5';
import { useEffect, useState } from 'react';

export const useSchema = (value, onChange) => {
  const [currentPage, setCurrentPage] = useState(null);
  const [schema, setSchema] = useState(() => {
    try {
      return JSON5.parse(value) || {};
    } catch (e) {
      console.error('Invalid JSON schema:', e);
      return {};
    }
  });

  useEffect(() => {
    if (onChange) {
      onChange(JSON.stringify(schema, null, 2));
    }
  }, [schema, onChange]);

  useEffect(() => {
    if (value) {
      try {
        const parsedSchema = JSON5.parse(value);
        setSchema(parsedSchema);
        if (!currentPage && Object.keys(parsedSchema.properties || {}).length > 0) {
          setCurrentPage(Object.keys(parsedSchema.properties)[0]);
        }
      } catch (e) {
        console.error('Invalid JSON schema:', e);
      }
    }
  }, [value]);

  const handleChangePageSchema = (newSchema) => {
    setSchema((prevSchema) => ({
      ...prevSchema,
      properties: {
        ...prevSchema.properties,
        [currentPage]: newSchema,
      },
    }));
  };

  const currentPageSchema = schema?.properties?.[currentPage] || {};

  return {
    schema,
    handleChange: setSchema,
    currentPage,
    setCurrentPage,
    currentPageSchema,
    handleChangePageSchema,
  };
}