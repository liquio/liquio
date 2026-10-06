// `react-markdown` and `remark-gfm` are admin-front-only dependencies (used by
// the BPMN AI assistant/builder) — not installed at all in cabinet-front's
// node_modules. admin-front's real, installed types take priority wherever
// they actually resolve.
declare module 'react-markdown' {
  import { ComponentType } from 'react';

  const ReactMarkdown: ComponentType<Record<string, unknown>>;
  export default ReactMarkdown;
}

declare module 'remark-gfm' {
  const remarkGfm: unknown;
  export default remarkGfm;
}
