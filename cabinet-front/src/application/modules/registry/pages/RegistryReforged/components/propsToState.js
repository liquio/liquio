import InitialState from 'modules/registry/pages/RegistryReforged/components/InitialState';

const arrayToObject = (array, value) => {
  return array.reduce((obj, item) => {
    obj[item] = value;
    return obj;
  }, {});
};

const propsToState = ({ t, selectedKey, renderTableCell, renderHeaderFilter, isHistory }) => {
  const defaultProps = InitialState(t, isHistory);

  if (!selectedKey || !selectedKey.schema) {
    return defaultProps;
  }

  let customColumns = [];

  if (typeof selectedKey.schema.toTable === 'object') {
    customColumns = Object.keys(selectedKey.schema.toTable);
  } else {
    customColumns = Object.keys(selectedKey.schema.properties || {});
  }

  const mapColumns = [
    ...defaultProps.columns,
    ...customColumns.map((propertyName) => {
      const field = ['data', propertyName].join('.');
      return {
        field,
        headerName: (selectedKey.schema.properties[propertyName] || {}).description || propertyName,
        hidden: !!(selectedKey.schema.properties[propertyName] || {}).hidden,
        sortable: !(selectedKey.schema.properties[propertyName] || {}).disableSort,
        dateFormat: (selectedKey.schema.properties[propertyName] || {}).dateFormat,
        control: (selectedKey.schema.properties[propertyName] || {}).control,
        editingEnabled: (selectedKey.schema.properties[propertyName] || {}).editingEnabled,
        propertyName,
        width: (selectedKey.schema.properties[propertyName] || {}).width,
        hiddenSearch: (selectedKey.schema.properties[propertyName] || {}).hiddenSearch
      };
    })
  ];

  const hiddenColumnsOrigin = (selectedKey?.schema?.hiddenColumns || []).map(
    (item) => `data.${item}`
  );

  return {
    columns: mapColumns.map((item) => {
      const isActions = item?.control === 'file';

      const renderCell = item?.renderCell
        ? item?.renderCell
        : ({ row }) => renderTableCell({ row, column: item, isHistory });

      return {
        ...item,
        type: isActions ? 'actions' : null,
        renderCell: isActions ? null : renderCell,
        renderHeaderFilter: () =>
          renderHeaderFilter && !item?.hiddenSearch ? renderHeaderFilter(item) : null,
        getActions: isActions ? renderCell : null
      };
    }),
    hiddenColumns: arrayToObject(defaultProps.hiddenColumns.concat(hiddenColumnsOrigin), false),
    customColumns: customColumns.map((propertyName) => ['data', propertyName].join('.'))
  };
};

export default propsToState;
