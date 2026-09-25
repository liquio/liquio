const mockSmsQueue = {
  belongsTo: jest.fn(),
  count: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

const mockIncommingMessages = {};

jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

jest.mock('request', () => jest.fn(), { virtual: true });

jest.mock('axios');

jest.mock('../sms_queue', () => jest.fn().mockImplementation(() => ({ SmsQueue: mockSmsQueue })));
jest.mock('../incomming_messages', () => jest.fn().mockImplementation(() => ({ IncommingMessages: mockIncommingMessages })));

const cron = require('node-cron');
const axios = require('axios');
const request = require('request');

describe('smsQueueScheduler xmlbuilder XML generation', () => {
  let scheduleTick;
  let scheduleSendTick;
  let scheduleCheckTick;

  beforeAll(() => {
    global.conf = {
      gmsuServer: {
        url: 'http://gmsu.test',
        senderName: 'TestSender',
        login: 'user',
        password: 'pass',
        messagesCountTick: 10,
      },
    };

    const scheduledFns = [];
    cron.schedule.mockImplementation((_expr, fn) => {
      scheduledFns.push(fn);
      return { start: jest.fn(), stop: jest.fn() };
    });

    require('./smsQueueScheduler');

    [scheduleTick, scheduleSendTick, scheduleCheckTick] = scheduledFns;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // statusCode >= 400 keeps us on the console.log branch; the >= 400 comparison
    // is what production code checks (axios never sets response.statusCode itself),
    // so this also avoids an unrelated pre-existing bug in the success branch
    // (a `for (let sms of sms)` self-shadowing loop) that is out of scope here.
    axios.mockResolvedValue({ statusCode: 400, statusText: 'n/a' });
  });

  it('builds a SEND_SMS xml document with escaped attributes and text content for each queued sms', async () => {
    mockSmsQueue.count.mockResolvedValue(0);
    mockSmsQueue.findAll.mockResolvedValue([
      {
        dataValues: {
          sms_id: 1,
          phone: '380501234567',
          forced: true,
          incomming_message: {
            dataValues: { short_message_translit: 'Test <message> & "quotes"' },
          },
        },
      },
    ]);

    await scheduleTick();
    await scheduleSendTick();

    expect(axios).toHaveBeenCalledTimes(1);
    const sentRequest = axios.mock.calls[0][0];
    const xml = sentRequest.body;

    expect(sentRequest.headers['Content-Type']).toBe('text/xml');
    expect(sentRequest.headers['Content-Length']).toBe(xml.length);

    expect(xml).toContain('<SEND_SMS>');
    expect(xml).toContain('<VERSION>1.0</VERSION>');
    expect(xml).toContain('<SENDER>TestSender</SENDER>');
    expect(xml).toContain('<TM_LIST>');
    expect(xml).toContain('<DST_MSISDN_LIST>');
    // attribute values must be XML-escaped by xmlbuilder
    expect(xml).toContain('extraID="1"');
    expect(xml).toContain('param="Test &lt;message> &amp; &quot;quotes&quot;"');
    // text content is the phone number
    expect(xml).toContain('">380501234567</DST_MSISDN>');
    expect(xml).toContain('<CONTENT_TEXT>{1}</CONTENT_TEXT>');
  });

  it('builds a GETSTATUS xml document listing pending message ids', async () => {
    mockSmsQueue.count.mockResolvedValue(1);
    mockSmsQueue.findAll.mockResolvedValueOnce([{ sms_id: 42 }]).mockResolvedValueOnce([]);

    await scheduleTick();
    await scheduleCheckTick();

    expect(request).toHaveBeenCalledTimes(1);
    const sentRequest = request.mock.calls[0][0];
    const xml = sentRequest.body;

    expect(sentRequest.headers['Content-Type']).toBe('text/xml');
    expect(xml).toContain('<GETSTATUS>');
    expect(xml).toContain('<VERSION>1.0</VERSION>');
    expect(xml).toContain('<MSGID_LIST>');
    expect(xml).toContain('<MSGID>42</MSGID>');
  });

  it('produces a well-formed xml declaration for every generated document', async () => {
    mockSmsQueue.count.mockResolvedValue(0);
    mockSmsQueue.findAll.mockResolvedValue([
      {
        dataValues: {
          sms_id: 2,
          phone: '380671112233',
          forced: false,
          incomming_message: { dataValues: { short_message_translit: 'hello' } },
        },
      },
    ]);

    await scheduleTick();
    await scheduleSendTick();

    const xml = axios.mock.calls[0][0].body;
    expect(xml.startsWith('<?xml version="1.0"')).toBe(true);
  });
});
