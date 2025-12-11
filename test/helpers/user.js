const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { debug } = require('./debug');

async function generateTestUser() {
  debug('generateTestUser: Generating random user credentials');

  // Generate random data
  const firstName = `Test${Math.random().toString(36).substring(2, 5)}`;
  const lastName = `User${Math.random().toString(36).substring(2, 5)}`;
  const serialNumber = Math.floor(Math.random() * 100000).toString();
  const password = `pass${Math.random().toString(36).substring(2, 8)}`;

  debug(`generateTestUser: Generated user ${firstName} ${lastName}, serial ${serialNumber}`);

  // Ensure test/data directory exists
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    debug('generateTestUser: Created test/data directory');
  }

  const p12Path = path.join(dataDir, `${serialNumber}.p12`);
  const jsonPath = path.join(dataDir, `${serialNumber}.json`);

  // Run the generate-user.sh script
  const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'generate-user.sh');
  const command = `${scriptPath} --first-name "${firstName}" --last-name "${lastName}" --serial-number "${serialNumber}" --password "${password}" --output "${p12Path}"`;

  debug(`generateTestUser: Running command: ${command}`);
  try {
    const result = execSync(command, { stdio: 'pipe', encoding: 'utf8' });
    debug(`generateTestUser: Script stdout: ${result}`);
    debug('generateTestUser: Script executed successfully');
  } catch (error) {
    debug(`generateTestUser: Script failed: ${error.message}`);
    if (error.stdout) debug(`generateTestUser: Script stdout: ${error.stdout}`);
    if (error.stderr) debug(`generateTestUser: Script stderr: ${error.stderr}`);
    throw error;
  }

  // Create JSON metadata
  const metadata = {
    firstName,
    lastName,
    serialNumber,
    password,
    p12Path: path.relative(path.join(__dirname, '..'), p12Path),
    jsonPath: path.relative(path.join(__dirname, '..'), jsonPath),
    createdAt: new Date().toISOString()
  };

  fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));
  debug(`generateTestUser: Saved metadata to ${jsonPath}`);

  return metadata;
}

module.exports = {
  generateTestUser,
};
