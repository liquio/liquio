import { getLog, resetAppContext, setAppContext } from '../lib/context';
import { UserController } from './user';

jest.mock('../businesses/user', () => ({ UserBusiness: jest.fn() }));
jest.mock('express-validator', () => ({ matchedData: jest.fn((req, { locations }) => (locations[0] === 'params' ? req.params : req.body)) }));

afterEach(() => {
  resetAppContext();
});

describe('UserController logging', () => {
  const authUserInfo = { userId: 'admin1', email: 'admin@example.com', ipn: '9876543210', name: 'Ann Admin', first_name: 'Ann', last_name: 'Admin' };
  let controller: UserController;

  beforeEach(() => {
    (UserController as any).singleton = undefined;
    setAppContext({ log: { save: jest.fn() } });
    controller = new UserController({});
    (controller as any).userBusiness = {
      deleteUser: jest.fn().mockResolvedValue(false),
      block: jest.fn().mockResolvedValue(false),
      setAdmin: jest.fn().mockResolvedValue(false),
    };
    jest.spyOn(controller, 'responseError').mockImplementation(() => undefined);
  });

  const expectNoPii = () => {
    const saved = JSON.stringify(getLog().save.mock.calls);
    expect(saved).not.toMatch(/admin@example\.com|9876543210|Ann|Admin"/);
    expect(saved).toContain('admin1');
  };

  it('should not log user PII or the target IPN when deleting a user', async () => {
    await controller.deleteUser({ params: { id: 'u2' }, body: { ipn: '1112223334' }, authUserInfo }, {});
    expectNoPii();
    expect(JSON.stringify(getLog().save.mock.calls)).not.toContain('1112223334');
  });

  it('should not log user PII when setting admin role', async () => {
    setAppContext({ config: { auth: { isCurrentAuthClientDefault: true } } });
    await controller.setAdmin({ params: { id: 'u2' }, body: {}, authUserInfo }, {});
    expectNoPii();
  });
});
