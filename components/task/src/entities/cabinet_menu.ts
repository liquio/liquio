import { Entity } from './entity';

export class CabinetMenuEntity extends Entity {
  id: string;
  parentId: string | null;
  order: number;
  name: string | null;
  description: string | null;
  icon: string | null;
  translations: Record<string, any>;
  type: string;
  options: Record<string, any>;
  access: Record<string, any>;
  enabled: boolean;

  constructor({
    id,
    parentId,
    order,
    name,
    description,
    icon,
    translations,
    type,
    options,
    access,
    enabled,
  }) {
    super();

    this.id = id;
    this.parentId = parentId;
    this.order = order;
    this.name = name;
    this.description = description;
    this.icon = icon;
    this.translations = translations;
    this.type = type;
    this.options = options;
    this.access = access;
    this.enabled = enabled;
  }

  getFilterProperties() {
    return [
      'id',
      'parentId',
      'order',
      'name',
      'description',
      'icon',
      'translations',
      'type',
      'options',
      'access',
      'enabled',
    ];
  }

  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}
