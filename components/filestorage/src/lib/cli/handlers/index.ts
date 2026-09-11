import { CliMigrateHandler } from './migrate';
import { CliSeparateHandler } from './separate';

const handlers: any = {
  migrate: new CliMigrateHandler(),
  separate: new CliSeparateHandler(),
};

export const getHandler = (name: string) => handlers[name];
