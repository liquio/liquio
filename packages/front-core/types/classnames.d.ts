declare module 'classnames' {
  type ClassValue = string | number | boolean | undefined | null | { [key: string]: unknown } | ClassValue[];

  function classNames(...args: ClassValue[]): string;

  export default classNames;
}
