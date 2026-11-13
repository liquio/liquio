// `react-syntax-highlighter` ships no types and there is no @types package installed.
declare module 'react-syntax-highlighter' {
  import { ComponentType, ReactNode } from 'react';

  interface SyntaxHighlighterProps {
    language?: string;
    style?: unknown;
    className?: string;
    PreTag?: string;
    codeTagProps?: Record<string, unknown>;
    children?: ReactNode;
    [key: string]: unknown;
  }

  export const Prism: ComponentType<SyntaxHighlighterProps>;
  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>;
  export default SyntaxHighlighter;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  const style: unknown;
  export const vscDarkPlus: unknown;
  export default style;
}
