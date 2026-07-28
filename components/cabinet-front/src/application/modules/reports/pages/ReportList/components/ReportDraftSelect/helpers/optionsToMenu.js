export default (option) =>
  option
    ? {
        ...option.data,
        id: option.id,
        value: option.id,
        label: option.data?.name
      }
    : null;
