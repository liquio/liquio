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
  async sendSms(phones: string[] = [], text: string, msgid?: string): Promise<string[]> {
    // Send SMS for all phones from list.
    const responses: string[] = [];
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
  async sendOneSms(phone: string, text: string, msgid?: string): Promise<string> {
    // Log.
    global.log.save('send-sms-request', { phone, text, msgid, isTest: true });

    // Define test response.
    const response = '"aaaaaaaa-1111-aaaa-1111-aaaaaaaaaaaa"';

    // Log.
    global.log.save('send-sms-response', { response, phone, text, msgid, isTest: true });

    // Return response.
    return response;
  }
}

export const testConsoleSmsAdapter = new TestConsoleSmsAdapter();
