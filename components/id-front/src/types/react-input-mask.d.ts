// The package's `types` field points at `./dist/index.js`, which TypeScript cannot read as a declaration file
// (its own `dist/index.d.ts` declares the component as `any`). Declare only the props the app passes.
declare module '@kerim-keskin/react-input-mask' {
  import type { ComponentType, Ref } from 'react';

  interface InputMaskProps {
    mask?: string;
    maskPlaceholder?: string | null;
    inputRef?: Ref<HTMLInputElement>;
    [key: string]: unknown;
  }

  const InputMask: ComponentType<InputMaskProps>;
  export default InputMask;
}
