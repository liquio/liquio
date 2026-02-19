/**
 * Test console SMS adapter.
 */
class TestConsoleSmsAdapter {
  /**
   * Send SMS.
   * @param {string[]} phones Phones list.
   * @param {string} text Text.
   * @param {string} [msgid] Message ID.
   */
  async sendSms(phones = [], text, msgid) {
    // Send SMS for all phones from list.
    const responses = [];
    for (const phone of phones) {
      const response = await this.sendOneSms(phone, text, msgid);
      responses.push(response);
    }

    // Return responses list.
    return responses;
  }

  /**
   * Send one SMS.
   * @param {string} phone Phone.
   * @param {string} text Text.
   * @param {string} msgid Message ID.
   */
  async sendOneSms(phone, text, msgid) {
    // Log.
    log.save('send-sms-request', { phone, text, msgid, isTest: true });

    // Define test response.
    const response = '"aaaaaaaa-1111-aaaa-1111-aaaaaaaaaaaa"';

    // Log.
    log.save('send-sms-response', { response, phone, text, msgid, isTest: true });

    // Return response.
    return response;
  }
}

module.exports = new TestConsoleSmsAdapter();
