/** A single schema validation problem. `path` is the Zod path joined with `.` (empty for the root). */
export interface ConfigIssue {
  path: string;
  code: string;
  message: string;
}

/** The configuration could not be loaded: missing path, unreadable or invalid files, invalid env values. */
export class ConfigLoadError extends Error {
  public readonly code = 'CONFIG_LOAD' as const;

  /**
   * @param {string} message Error message. Never contains config values.
   */
  constructor(message: string) {
    super(message);
    this.name = 'ConfigLoadError';
  }
}

/** The loaded configuration does not match the schema. Issues never contain the received values. */
export class ConfigValidationError extends Error {
  public readonly code = 'CONFIG_VALIDATION' as const;
  public readonly issues: ConfigIssue[];

  /**
   * @param {ConfigIssue[]} issues Validation issues.
   */
  constructor(issues: ConfigIssue[]) {
    super(`Invalid config: ${issues.map((i) => `${i.path || '(root)'}: ${i.message}`).join('; ')}`);
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}
