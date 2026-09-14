declare module 'react-input-mask' {
  import { ComponentType, Ref } from 'react';

  interface InputMaskProps {
    mask?: string;
    maskChar?: string | null;
    formatChars?: Record<string, string>;
    alwaysShowMask?: boolean;
    inputRef?: Ref<HTMLInputElement>;
    beforeMaskedValueChange?: (
      newState: { value: string; selection: { start: number; end: number } | null },
      oldState: { value: string; selection: { start: number; end: number } | null },
      userInput: string,
    ) => { value: string; selection: { start: number; end: number } | null };
    [key: string]: unknown;
  }

  const InputMask: ComponentType<InputMaskProps>;
  export default InputMask;
}
