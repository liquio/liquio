const { execSync } = require('child_process');
const { debug } = require('./debug');

/**
 * Extracts a 6-digit confirmation PIN from docker compose logs
 * Greps for 'email-send-success' message and extracts the PIN
 * 
 * @param {number} maxRetries - Maximum number of retry attempts (default: 10)
 * @param {number} delayMs - Delay between retries in milliseconds (default: 500)
 * @returns {Promise<string>} The 6-digit PIN extracted from logs
 * @throws {Error} If PIN cannot be extracted after all retries
 */
async function getConfirmationPinFromDockerLogs(maxRetries = 10, delayMs = 500) {
  debug('getConfirmationPinFromDockerLogs: Starting PIN extraction from docker compose logs');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      debug(`getConfirmationPinFromDockerLogs: Attempt ${attempt}/${maxRetries}`);
      
      // Run docker compose logs command and grep for email-send-success
      const logsOutput = execSync('docker compose logs | grep "email-send-success"', {
        stdio: 'pipe',
        encoding: 'utf8',
        shell: '/bin/bash'
      });

      debug('getConfirmationPinFromDockerLogs: Found matching log entries, searching for PIN');

      // Extract 6-digit PIN from the logs using regex
      // The PIN is in the email body in the format: " 110836 </div>"
      // Use global flag to find all matches, then take the last one (most recent)
      const allPinMatches = logsOutput.match(/>\s*(\d{6})\s*<\/div>/g);
      
      if (allPinMatches && allPinMatches.length > 0) {
        // Extract the digit from the last match
        const lastMatch = allPinMatches[allPinMatches.length - 1];
        const pinMatch = lastMatch.match(/\d{6}/);
        const pin = pinMatch[0];
        debug(`getConfirmationPinFromDockerLogs: ✓ Successfully extracted PIN: ${pin} (from ${allPinMatches.length} matches)`);
        return pin;
      }

      debug('getConfirmationPinFromDockerLogs: No 6-digit PIN found in matched logs');
      
      if (attempt < maxRetries) {
        debug(`getConfirmationPinFromDockerLogs: Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      debug(`getConfirmationPinFromDockerLogs: Attempt ${attempt}/${maxRetries} error: ${error.message}`);
      
      if (attempt < maxRetries) {
        debug(`getConfirmationPinFromDockerLogs: Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(`Failed to extract 6-digit PIN from docker compose logs after ${maxRetries} attempts`);
}

module.exports = {
  getConfirmationPinFromDockerLogs,
};
