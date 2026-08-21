export default (type) => (element) => {
  const elementId =
    element && element.businessObject ? element.businessObject.id : element;
  return (
    elementId.indexOf(type) === 0 &&
    (element.id || element).indexOf('label') === -1
  );
};
