import { Sandbox } from '@liquio/back-core';

const MAX_RULE_LENGTH = 4096;

// Default `message_crypt_types.rule_to_show` value, handled natively because `Buffer` is not available in the sandbox.
const DEFAULT_RULE = "(decryptedbase64)=>buffer.from(decryptedbase64,'base64').tostring('utf8')";

let sandbox: Sandbox | undefined;

function getSandbox(): Sandbox {
  if (!sandbox) {
    sandbox = new Sandbox({
      isolationLevel: 'isolated-vm' as any,
      getLog: () => (global as any).log || { save: () => undefined },
    });
  }
  return sandbox;
}

function isDefaultRule(rule: string): boolean {
  return rule.replace(/\s+/g, '').replace(/;+$/, '').replace(/"/g, "'").toLowerCase() === DEFAULT_RULE;
}

/**
 * Render decrypted message content using the `rule_to_show` of its crypt type.
 * The rule is DB-stored code, so it never runs in the host realm: the default rule is a native base64 decode,
 * any other rule must be an arrow function and runs inside an isolated-vm isolate.
 * @param {string} ruleToShow Rule (arrow function string).
 * @param {string} decryptedBase64 Decrypted base64 content.
 * @returns {string} Text to show.
 * @throws {Error} If the rule is rejected or fails.
 */
export function renderDecrypted(ruleToShow: string, decryptedBase64: string): any {
  if (typeof ruleToShow !== 'string' || ruleToShow.length > MAX_RULE_LENGTH) {
    throw new Error('Invalid rule_to_show.');
  }
  if (isDefaultRule(ruleToShow)) {
    return Buffer.from(String(decryptedBase64), 'base64').toString('utf8');
  }
  const result = getSandbox().evalWithArgs(ruleToShow, [decryptedBase64], { checkArrow: true });
  if (result === ruleToShow) {
    throw new Error('rule_to_show must be an arrow function.');
  }
  return result;
}
