// This package ships its own `dist/index.d.ts`, but its package.json has no
// `types`/`typings` field, so TypeScript can't auto-discover it (the same
// issue as `react-leaflet-fullscreen` elsewhere in this migration).
declare module 'react-draggable-bottom-sheet' {
  import React from 'react';

  interface BottomSheetProps {
    children: React.ReactNode;
    close: () => void;
    isOpen: boolean;
    modalOnDesktop?: boolean;
    desktopBreakpoint?: number;
    disabled?: boolean;
    onDrag?: (...args: unknown[]) => void;
    onMouseDown?: (e: MouseEvent) => void;
    onStart?: (...args: unknown[]) => void;
    onBackdropClick?: React.MouseEventHandler;
    scrollableElement?: HTMLElement;
    classNames?: {
      bottomSheet?: string;
      backdrop?: string;
      draggable?: string;
      window?: { wrap?: string; content?: string };
      dragIndicator?: { wrap?: string; indicator?: string };
    };
    styles?: {
      bottomSheet?: React.CSSProperties;
      backdrop?: React.CSSProperties;
      draggable?: React.CSSProperties;
      window?: { wrap?: React.CSSProperties; content?: React.CSSProperties };
      dragIndicator?: { wrap?: React.CSSProperties; indicator?: React.CSSProperties };
    };
  }

  const BottomSheet: React.ComponentType<BottomSheetProps>;
  export default BottomSheet;
}
