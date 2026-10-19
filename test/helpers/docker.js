const { execFileSync, execSync } = require('child_process');
const { debug } = require('./debug');

/**
 * Reads the 6-digit confirmation PIN of the latest email sent to an address.
 * id-api does not log message bodies, so the PIN is taken from the email that the notification service stored in its database.
 *
 * @param {string} email - Address the confirmation email was sent to
 * @param {number} maxRetries - Maximum number of retry attempts (default: 10)
 * @param {number} delayMs - Delay between retries in milliseconds (default: 500)
 * @returns {Promise<string>} The 6-digit PIN from the email body
 * @throws {Error} If no PIN is found after all retries
 */
async function getConfirmationPinFromNotifyDb(email, maxRetries = 10, delayMs = 500) {
  // The address goes in as a psql variable through stdin (psql -c does not interpolate variables), never spliced into the SQL.
  const query = `SELECT substring(full_message from '>\\s*([0-9]{6})\\s*</div>') FROM incomming_messages
    WHERE :'email' = ANY(list_email) ORDER BY message_id DESC LIMIT 1;`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    debug(`getConfirmationPinFromNotifyDb: Attempt ${attempt}/${maxRetries} for ${email}`);
    try {
      const pin = execFileSync(
        'docker',
        ['compose', 'exec', '-T', 'postgres', 'sh', '-c', 'psql -U "$POSTGRES_USER" -d notify -At -v email="$1"', 'sh', email],
        { input: query, stdio: 'pipe', encoding: 'utf8' },
      ).trim();

      if (/^\d{6}$/.test(pin)) {
        debug(`getConfirmationPinFromNotifyDb: Found PIN ${pin}`);
        return pin;
      }
      debug('getConfirmationPinFromNotifyDb: No PIN stored yet');
    } catch (error) {
      debug(`getConfirmationPinFromNotifyDb: Attempt ${attempt}/${maxRetries} error: ${error.message}`);
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Failed to read a 6-digit PIN for ${email} from the notify database after ${maxRetries} attempts`);
}

/**
 * Returns docker compose logs of a single service
 *
 * @param {string} service - Docker compose service name (e.g. 'task')
 * @param {Date} [since] - Only return logs written after this moment
 * @returns {string} Service logs
 */
function getDockerComposeLogs(service, since) {
  const sinceArg = since ? ` --since ${since.toISOString()}` : '';
  debug(`getDockerComposeLogs: Reading logs of ${service}${sinceArg}`);

  return execSync(`docker compose logs ${service} --no-log-prefix${sinceArg}`, {
    stdio: 'pipe',
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

module.exports = {
  getConfirmationPinFromNotifyDb,
  getDockerComposeLogs,
};
