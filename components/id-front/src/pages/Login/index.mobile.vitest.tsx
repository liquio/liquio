import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore } from 'redux';

import renderWithTranslations from '../../testHelpers/renderWithTranslations';
import reducers from 'reducers';
import LoginPage from 'pages/Login';
import { requestSignData } from 'actions/eds';

// `isMobile` is read once when the module loads, so the mobile behavior has its own file.
vi.mock('mobile-detect', () => ({ default: class { mobile = () => 'iPhone'; } }));
vi.mock('actions/eds', () => ({ requestSignData: vi.fn(), checkSignData: vi.fn() }));
vi.mock('actions/auth', () => ({ getAuth: vi.fn() }));

const layout = vi.hoisted(() => ({ props: undefined as undefined | Record<string, (...args: unknown[]) => unknown> & { setId: (n: string) => string } }));
vi.mock('./components/DefaultLoginLayout', () => ({
  default: (props: NonNullable<typeof layout.props>) => {
    layout.props = props;
    return <p>login layout</p>;
  },
}));

const mockedSignData = vi.mocked(requestSignData);

describe('pages/Login on a mobile browser', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedSignData.mockReset();
    renderWithTranslations(
      <Provider store={createStore(reducers)}>
        <LoginPage />
      </Provider>,
    );
  });

  it('stores the fresh token in localStorage', async () => {
    mockedSignData.mockResolvedValue({ token: 'fresh' });
    const result = (await layout.props?.getDataToSign()) as { data: Array<{ data: string }> };
    expect(result.data[0].data).toBe('fresh');
    expect(localStorage.getItem('savedToken')).toBe('fresh');
  });

  it('reuses a saved token without asking for a new one', async () => {
    localStorage.setItem('savedToken', 'saved');
    const result = (await layout.props?.getDataToSign()) as { data: Array<{ data: string }> };
    expect(result.data[0].data).toBe('saved');
    expect(mockedSignData).not.toHaveBeenCalled();
  });
});
