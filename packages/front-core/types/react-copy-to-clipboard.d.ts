declare module 'react-copy-to-clipboard' {
  import { ComponentType, ReactNode } from 'react';

  interface CopyToClipboardProps {
    text: string;
    onCopy?: (text: string, result: boolean) => void;
    options?: {
      debug?: boolean;
      message?: string;
      format?: string;
    };
    children: ReactNode;
  }

  export const CopyToClipboard: ComponentType<CopyToClipboardProps>;
}
