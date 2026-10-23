declare module 'qrcode.react' {
  import { ComponentType } from 'react';

  interface QRCodeProps {
    value: string;
    size?: number;
    bgColor?: string;
    fgColor?: string;
    level?: 'L' | 'M' | 'Q' | 'H';
    includeMargin?: boolean;
    renderAs?: 'svg' | 'canvas';
    className?: string;
    onClick?: (event: import('react').MouseEvent) => void;
    imageSettings?: {
      src: string;
      height: number;
      width: number;
      excavate?: boolean;
      x?: number;
      y?: number;
    };
  }

  const QRCode: ComponentType<QRCodeProps>;
  export default QRCode;
}
