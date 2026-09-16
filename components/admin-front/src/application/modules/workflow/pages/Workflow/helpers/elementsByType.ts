interface BpmnElementLike {
  id?: string;
  businessObject?: { id?: string };
}

export default (type: string) => (element: BpmnElementLike | string) => {
  const elementId =
    element && (element as BpmnElementLike).businessObject
      ? ((element as BpmnElementLike).businessObject as { id?: string }).id
      : (element as string);
  return (
    (elementId as string).indexOf(type) === 0 &&
    (((element as BpmnElementLike).id || element) as string).indexOf('label') === -1
  );
};
