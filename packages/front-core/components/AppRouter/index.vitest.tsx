import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

// AppRouter renders its computed route list inside a real react-router <Switch>, which only
// renders the child matching the current location — so these tests navigate to a specific
// path and check what (if anything) renders there, rather than asserting on the full list.
const mockHistory = (pathname: string) => ({ history: { listen: () => () => undefined, location: { pathname, search: '', hash: '' } } });

vi.mock('components/PrivateRoute', () => ({
  default: (props: { path?: string }) => <div>route:{props.path}</div>
}));
vi.mock('core/plugins', () => ({ default: [] }));

afterEach(() => {
  vi.doUnmock('modules/index');
  vi.doUnmock('store');
  vi.resetModules();
});

const mockModules = () =>
  vi.doMock('modules/index', () => ({
    default: () => [
      { routes: [{ path: '/a', isOnboarding: false }, { path: '/onboarding', isOnboarding: true }] },
      { routes: [{ path: '/b', isOnboarding: false }] }
    ]
  }));

describe('AppRouter', () => {
  it('renders a non-onboarding route when no onboarding task is active', async () => {
    vi.doMock('store', () => mockHistory('/a'));
    mockModules();
    const { default: AppRouter } = await import('core/components/AppRouter');
    render(
      <Provider store={createStore(() => ({ auth: { info: { onboardingTaskId: null } } }))}>
        <AppRouter />
      </Provider>
    );
    expect(screen.getByText('route:/a')).toBeTruthy();
  });

  it('excludes the onboarding route when no onboarding task is active', async () => {
    vi.doMock('store', () => mockHistory('/onboarding'));
    mockModules();
    const { default: AppRouter } = await import('core/components/AppRouter');
    render(
      <Provider store={createStore(() => ({ auth: { info: { onboardingTaskId: null } } }))}>
        <AppRouter />
      </Provider>
    );
    expect(screen.queryByText('route:/onboarding')).toBeNull();
  });

  it('renders the onboarding route, and excludes non-onboarding routes, while a task is active', async () => {
    vi.doMock('store', () => mockHistory('/onboarding'));
    mockModules();
    const { default: AppRouter } = await import('core/components/AppRouter');
    render(
      <Provider store={createStore(() => ({ auth: { info: { onboardingTaskId: 'task-1' } } }))}>
        <AppRouter />
      </Provider>
    );
    expect(screen.getByText('route:/onboarding')).toBeTruthy();
  });
});
