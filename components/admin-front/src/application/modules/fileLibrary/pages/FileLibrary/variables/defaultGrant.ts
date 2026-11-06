export interface Grant {
  subjectType: string;
  subjectId: string;
  permission: string;
  inherit: boolean;
}

export const DEFAULT_GRANT: Grant = {
  subjectType: 'user',
  subjectId: '',
  permission: 'read',
  inherit: true
};
