import { NotFoundError } from './not_found';
import { AccessError } from './access';
import { CommitedError } from './committed';
import { WorkflowError } from './workflow';
import { UnitError } from './unit';

export const Exceptions = {
  NOT_FOUND: NotFoundError,
  ACCESS: AccessError,
  COMMITED: CommitedError,
  WORKFLOW: WorkflowError,
  UNIT: UnitError,
};
