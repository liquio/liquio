import { test, expect, type APIRequestContext } from '@playwright/test';
import { ID_API_URL, getTaskIdApiBasicAuthHeader, setUserEmail, getUserEmail, pickOtherUserId, log } from './helpers';

/*
 * GET /user?email= of id-api must be an exact (case-insensitive) match, as task calls it for one performer email.
 * A user whose email merely starts with the requested address must not be returned.
 * Prefix search is a separate parameter, emailPrefix.
 */

const VICTIM_USER_ID = '000000000000000000000001';
const VICTIM_EMAIL = 'prefix-victim@example.test';
const ATTACKER_EMAIL = `${VICTIM_EMAIL}.evil.example`;

test.describe('id-api exact email lookup', () => {
  test.describe.configure({ mode: 'serial' });

  let attackerUserId: string;
  let originalVictimEmail: string | null;
  let originalAttackerEmail: string | null;

  const lookup = async (request: APIRequestContext, params: Record<string, string>) =>
    request.get(`${ID_API_URL}/user`, { params, headers: { Authorization: getTaskIdApiBasicAuthHeader() } });

  const lookupIds = async (request: APIRequestContext, params: Record<string, string>): Promise<string[]> => {
    const response = await lookup(request, params);
    expect(response.status(), await response.text()).toBe(200);
    const users = await response.json();
    return users.map((user: { userId: string }) => user.userId);
  };

  test.beforeAll(() => {
    attackerUserId = pickOtherUserId(VICTIM_USER_ID);
    originalVictimEmail = getUserEmail(VICTIM_USER_ID);
    originalAttackerEmail = getUserEmail(attackerUserId);
    try {
      setUserEmail(VICTIM_USER_ID, VICTIM_EMAIL);
      setUserEmail(attackerUserId, ATTACKER_EMAIL);
    } catch (error) {
      setUserEmail(VICTIM_USER_ID, originalVictimEmail);
      setUserEmail(attackerUserId, originalAttackerEmail);
      throw error;
    }
    log(`email lookup fixture: victim=${VICTIM_EMAIL} attacker=${ATTACKER_EMAIL}`);
  });

  test.afterAll(() => {
    if (!attackerUserId) {
      return;
    }
    try {
      setUserEmail(VICTIM_USER_ID, originalVictimEmail);
    } finally {
      setUserEmail(attackerUserId, originalAttackerEmail);
    }
  });

  test('single exact email returns only its owner', async ({ request }) => {
    const ids = await lookupIds(request, { email: VICTIM_EMAIL });
    expect(ids).toContain(VICTIM_USER_ID);
    expect(ids).not.toContain(attackerUserId);
  });

  test('trailing comma and upper case return only its owner', async ({ request }) => {
    for (const email of [`${VICTIM_EMAIL},`, VICTIM_EMAIL.toUpperCase()]) {
      const ids = await lookupIds(request, { email });
      expect(ids, email).toContain(VICTIM_USER_ID);
      expect(ids, email).not.toContain(attackerUserId);
    }
  });

  test('emailPrefix still finds both users', async ({ request }) => {
    const ids = await lookupIds(request, { emailPrefix: VICTIM_EMAIL });
    expect(ids).toContain(VICTIM_USER_ID);
    expect(ids).toContain(attackerUserId);
  });

  test('emailPrefix shorter than 3 characters is rejected', async ({ request }) => {
    const response = await lookup(request, { emailPrefix: 'ab' });
    expect(response.status()).toBe(400);
  });
});
