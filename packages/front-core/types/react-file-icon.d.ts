declare module 'react-file-icon' {
  import { ComponentType } from 'react';

  interface FileIconProps {
    extension?: string;
    size?: number;
    color?: string;
    glyphColor?: string;
    labelColor?: string;
    type?: string;
    [key: string]: unknown;
  }

  export const FileIcon: ComponentType<FileIconProps>;
  export const defaultStyles: Record<string, Partial<FileIconProps>>;
}
