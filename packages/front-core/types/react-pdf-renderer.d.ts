declare module '@react-pdf/renderer' {
  import { ComponentType, ReactNode } from 'react';

  export const Document: ComponentType<{ children?: ReactNode }>;
  export const Page: ComponentType<{
    children?: ReactNode;
    style?: Record<string, unknown>;
    size?: string;
    orientation?: 'portrait' | 'landscape';
  }>;

  export const Font: {
    register(font: { family: string; src: string; [key: string]: unknown }): void;
  };

  export const StyleSheet: {
    create<T extends Record<string, Record<string, unknown>>>(styles: T): T;
  };

  export interface PDFInstance {
    loading: boolean;
    url: string | null;
    blob: Blob | null;
    error: string | null;
  }

  export function usePDF(options?: { document?: ReactNode }): [PDFInstance, (document: ReactNode) => void];
}
