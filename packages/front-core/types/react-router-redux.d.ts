declare module 'react-router-redux' {
  import { History } from 'history';

  interface RouterState {
    location: unknown;
  }

  export function routerReducer(state: RouterState | undefined, action: { type: string; payload?: unknown }): RouterState;

  export function routerMiddleware(history: History): (next: (action: unknown) => unknown) => (action: unknown) => unknown;
}
