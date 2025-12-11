export default (option) =>
  option
    ? {
        ...option,
        id: option?.tempate?.ReportGuid,
        value: option?.tempate?.ReportGuid,
        label: option.name,
      }
    : null;
