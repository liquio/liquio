import { Entity } from './entity';

interface CabinetMenuEntityOptions {
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
}

export class CabinetMenuEntity extends Entity<CabinetMenuEntityOptions> {}

export interface CabinetMenuEntity extends CabinetMenuEntityOptions {}
