import React from 'react';
import objectPath from 'object-path';

import Preloader from 'components/Preloader';
import useTable from 'services/dataTable/useTable';
import { SchemaForm } from 'components/JsonSchema';
import propertiesEach from 'components/JsonSchema/helpers/propertiesEach';

import schema from 'modules/users/pages/Unit/variables/interfacePartSchema.js';

const InterfacePart = ({ value, onChange, readOnly, t }) => {
  const { loading, data: uiFilters } = useTable({
    dataURL: 'ui-filters',
    sourceName: 'ui-filters',
    autoLoad: true
  });

  if (loading) {
    return <Preloader flex={true} />;
  }

  const partSchema = JSON.parse(JSON.stringify(schema(t)));

  propertiesEach(partSchema, value, (sc, data, path) => {
    if (!sc.uiFilter || !uiFilters) return;

    const uiFilter = uiFilters.find(({ filter }) => filter === sc.uiFilter);
    const controlPath = 'properties.' + path.split('.').filter(Boolean).join('.properties.');

    if (!uiFilter || !uiFilter.isActive) {
      objectPath.del(partSchema, controlPath);
    }
  });

  return <SchemaForm value={value} readOnly={readOnly} schema={partSchema} onChange={onChange} />;
};

export default InterfacePart;
