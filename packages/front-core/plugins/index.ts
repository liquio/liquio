export interface Plugin {
  translations?: Record<string, Record<string, string>>;
  [key: string]: unknown;
}

export default [] as Plugin[];
