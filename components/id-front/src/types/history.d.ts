// history v4 ships no types. Only `createBrowserHistory` and the `History` shape are declared.
declare module 'history' {
  export interface Location<S = unknown> {
    pathname: string;
    search: string;
    hash: string;
    state?: S;
    key?: string;
  }

  export interface History<S = unknown> {
    length: number;
    action: 'PUSH' | 'REPLACE' | 'POP';
    location: Location<S>;
    push(path: string, state?: S): void;
    replace(path: string, state?: S): void;
    go(n: number): void;
    goBack(): void;
    goForward(): void;
    block(
      prompt?: string | boolean | ((location: Location<S>, action: string) => string | boolean | void),
    ): () => void;
    listen(listener: (location: Location<S>, action: string) => void): () => void;
    createHref(location: Location<S>): string;
  }

  export interface BrowserHistoryBuildOptions {
    basename?: string;
    forceRefresh?: boolean;
    getUserConfirmation?: (message: string, callback: (result: boolean) => void) => void;
    keyLength?: number;
  }

  export function createBrowserHistory(options?: BrowserHistoryBuildOptions): History;
}
