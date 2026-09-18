// `md5` ships no types and is only a dependency of admin-front (not
// cabinet-front), so this ambient declaration lives here rather than in
// packages/front-core/types/ — scoped to actual usage (ProfileAppbar.tsx's
// gravatar hash).
declare module 'md5' {
  export default function md5(value: string): string;
}
