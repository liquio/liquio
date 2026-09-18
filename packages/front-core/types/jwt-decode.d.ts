// `jwt-decode` (v2.2.0, this project's installed version) ships no types
// and there is no matching @types package.
declare module 'jwt-decode' {
  export default function jwtDecode<T = Record<string, unknown>>(token: string): T;
}
