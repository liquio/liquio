declare module 'react-router-dom' {
  import { ComponentType, ReactNode } from 'react';
  import { History, Location } from 'history';

  export interface Match<Params = Record<string, string>> {
    params: Params;
    isExact: boolean;
    path: string;
    url: string;
  }

  export interface RouteComponentProps<Params = Record<string, string>> {
    match: Match<Params>;
    location: Location;
    history: History;
  }

  // Route/Redirect are used with app-specific config objects spread onto them (e.g. per-route
  // access flags), well beyond react-router's own props, so this stays intentionally permissive.
  export interface RouteProps {
    exact?: boolean;
    strict?: boolean;
    sensitive?: boolean;
    path?: string | string[];
    component?: ComponentType<RouteComponentProps>;
    render?: (props: RouteComponentProps) => ReactNode;
    children?: ReactNode | ((props: RouteComponentProps) => ReactNode);
    [key: string]: unknown;
  }

  export interface RedirectProps {
    to: string | { pathname: string; state?: unknown };
    from?: string;
    exact?: boolean;
    strict?: boolean;
    push?: boolean;
    [key: string]: unknown;
  }

  export const Route: ComponentType<RouteProps>;
  export const Redirect: ComponentType<RedirectProps>;
  export const Switch: ComponentType<{ children?: ReactNode }>;
  export const Router: ComponentType<{ history: History; children?: ReactNode }>;
  export const MemoryRouter: ComponentType<{ initialEntries?: string[]; initialIndex?: number; children?: ReactNode }>;
  export const Link: ComponentType<{ to: string | { pathname: string }; [key: string]: unknown }>;

  // react-router v5's NavLink — activeClassName/exact are v5-only props.
  export interface NavLinkProps {
    to: string | { pathname: string };
    exact?: boolean;
    strict?: boolean;
    activeClassName?: string;
    className?: string;
    id?: string | number;
    children?: ReactNode;
    onClick?: (event: unknown) => void;
    [key: string]: unknown;
  }
  export const NavLink: ComponentType<NavLinkProps>;
}
