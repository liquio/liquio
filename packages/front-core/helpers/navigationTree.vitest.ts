import { describe, expect, it, vi } from 'vitest';
import { getNavigationTitleByPath } from 'helpers/navigationTree';

// navigationTree -> localization -> actions/auth, which boots the real Redux store on import;
// stub it so the chain doesn't require a loaded runtime config.
vi.mock('actions/auth', () => ({ getQueryLangParam: () => null }));

const items = [
  {
    path: '/users',
    name: 'Users',
    translations: { uk: 'Користувачі' },
    children: [{ path: 'list', name: 'List', translations: { uk: 'Список' } }]
  }
];

describe('getNavigationTitleByPath', () => {
  it('finds a translated title by exact path', () => {
    expect(getNavigationTitleByPath(items, '/users', 'uk')).toBe('Користувачі');
  });

  it('resolves nested relative child paths', () => {
    expect(getNavigationTitleByPath(items, '/users/list', 'uk')).toBe('Список');
  });

  it('falls back to the item name when no translation matches', () => {
    expect(getNavigationTitleByPath(items, '/users', 'fr')).toBe('Users');
  });

  it('returns an empty string for an unknown path', () => {
    expect(getNavigationTitleByPath(items, '/missing', 'uk')).toBe('');
  });
});
