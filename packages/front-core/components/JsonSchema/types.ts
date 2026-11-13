export interface JsonSchemaNode {
  type?: string;
  control?: string;
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode[] | JsonSchemaNode;
  required?: string[];
  allVisibleRequired?: boolean;
  checkRequired?: string | boolean;
  checkValid?: unknown;
  hidden?: string | boolean;
  checkHidden?: string | boolean;
  isDisabled?: string | boolean;
  checkReadonly?: string | boolean;
  checkReadOnly?: string | boolean;
  htmlMaxLength?: number;
  htmlMinLength?: number;
  dateFormat?: string;
  minDate?: string;
  maxDate?: string;
  useOwnDataArray?: boolean;
  getSample?: string;
  getMessage?: unknown;
  id?: string | number;
  [key: string]: unknown;
}

export type PropertiesEachCallback = (
  propertySchema: JsonSchemaNode,
  propertyData: unknown,
  propertyPath: string,
  parentSchema: JsonSchemaNode,
  parentData: unknown,
  propertyKey: string | number,
  popupValue: unknown,
) => void;

export interface RootDocument {
  data: Record<string, unknown>;
  [key: string]: unknown;
}
