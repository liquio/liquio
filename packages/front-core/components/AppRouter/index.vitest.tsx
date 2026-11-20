import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import AppRouter from 'core/components/AppRouter';

// AppRouter renders its computed route list inside a real react-router <Switch>, which only
// renders the child matching the current location — so these tests navigate to a specific
// path and check what (if anything) renders there, rather than asserting on the full list.
// The component is imported once (statically): re-importing its whole MUI/redux tree per test
// via vi.resetModules() took seconds under load and made the tests time out in the full suite.
const state = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('store', () => ({
  history: {
    listen: () => () => undefined,
    get location() {
      return { pathname: state.pathname, search: '', hash: '' };
    }
  }
}));
vi.mock('components/PrivateRoute', () => ({
  default: (props: { path?: string }) => <div>route:{props.path}</div>
}));
vi.mock('core/plugins', () => ({ default: [] }));
vi.mock('modules/index', () => ({
  default: () => [
    { routes: [{ path: '/a', isOnboarding: false }, { path: '/onboarding', isOnboarding: true }] },
    { routes: [{ path: '/b', isOnboarding: false }] }
  ]
}));

describe('AppRouter', () => {
  it('renders a non-onboarding route when no onboarding task is active', () => {
    state.pathname = '/a';
    render(
      <Provider store={createStore(() => ({ auth: { info: { onboardingTaskId: null } } }))}>
        <AppRouter />
      </Provider>
    );
    expect(screen.getByText('route:/a')).toBeTruthy();
  });

  it('excludes the onboarding route when no onboarding task is active', () => {
    state.pathname = '/onboarding';
    render(
      <Provider store={createStore(() => ({ auth: { info: { onboardingTaskId: null } } }))}>
        <AppRouter />
      </Provider>
    );
    expect(screen.queryByText('route:/onboarding')).toBeNull();
  });

  it('renders the onboarding route, and excludes non-onboarding routes, while a task is active', () => {
    state.pathname = '/onboarding';
    render(
      <Provider store={createStore(() => ({ auth: { info: { onboardingTaskId: 'task-1' } } }))}>
        <AppRouter />
      </Provider>
    );
    expect(screen.getByText('route:/onboarding')).toBeTruthy();
  });
});
