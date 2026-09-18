const SmsQueueModel = require('../sms_queue');
const IncommingMessagesModel = require('../incomming_messages');
const axios = require('axios');
let { conf } = global;
const builder = require('xmlbuilder');
let XmlStream = require('xml-stream');
let Readable = require('stream').Readable;
const request = require('request');
const SmsQueue = new SmsQueueModel().SmsQueue;
const AllMessage = new IncommingMessagesModel().IncommingMessages;
SmsQueue.belongsTo(AllMessage, { foreignKey: 'message_id' });
const cron = require('node-cron');
Set.prototype.splice = function (count) {
  let arr = [...this];
  let r = arr.splice(count);
  this.clear();
  for (let i of r) {
    this.add(i);
  }
  return arr;
};
let smsQueueArray = new Set();
let waitingSmsQueueArray = new Set();
if (!!conf.gmsuServer == false) {
  conf.gmsuServer = {};
}

const scheduler = (start = true) => {
  if (start == true) {
    schedule.start();
  } else {
    schedule.stop();
  }
};
const schedulerChecker = (start = true) => {
  if (start == true) {
    scheduleCheck.start();
  } else {
    scheduleCheck.stop();
  }
};
const schedulerSender = (start = true) => {
  if (start == true) {
    scheduleSend.start();
  } else {
    scheduleSend.stop();
  }
};

const schedule = cron.schedule(
  '15,45 * * * * *',
  async () => {
    let couter = await SmsQueue.count({
      where: {
        status: 'sended',
      },
    });
    if (couter > 0) {
      let arr = await SmsQueue.findAll({
        attributes: ['sms_id'],
        where: {
          status: 'sended',
        },
      });
      waitingSmsQueueArray = new Set(arr);
      schedulerChecker(true);
    }
    let sms = await SmsQueue.findAll({
      where: {
        status: 'waiting',
      },
      include: [
        {
          model: AllMessage,
        },
      ],
      limit: 600,
      order: [
        // Will escape username and validate DESC against a list of valid direction parameters
        ['forced', 'DESC'],
        ['created_at', 'DESC'],
      ],
    });
    if (sms && sms.length > 0) {
      let smsQueue = [...smsQueueArray];
      smsQueueArray.clear();
      sms = sms.map((v) => v.dataValues);
      smsQueue = [...smsQueue, ...sms];
      smsQueue.sort((a, b) => a.forced - b.forced);
      smsQueueArray = new Set(smsQueue);
      schedulerSender(true);
    } else {
      scheduler(false);
    }
  },
  false,
);

const scheduleSend = cron.schedule(
  '* * * * * *',
  async () => {
    if (smsQueueArray.size == 0) return schedulerSender(false);

    let sms = smsQueueArray.splice(conf.gmsuServer.messagesCountTick);

    let DST_MSISDN = sms.map((v) => {
      return {
        '@extraID': v.sms_id.toString(),
        '@param': v.incomming_message.dataValues.short_message_translit.toString(),
        '#text': v.phone.toString(),
      };
    });
    let objX = {
      SEND_SMS: {
        VERSION: '1.0',
        SENDER: conf.gmsuServer.senderName,
        SEPARATOP: ':',
        TM_LIST: {
          TM: {
            DST_MSISDN_LIST: {
              DST_MSISDN,
            },
            CONTENT_LIST: {
              CONTENT: {
                CONTENT_TEXT: '{1}',
              },
            },
          },
        },
      },
    };
    let xml = builder.create(objX).end({ pretty: true });
    let obj = {
      url: `${conf.gmsuServer.url}/sms.php`,
      method: 'POST',
      body: xml,
      headers: {
        'Content-Type': 'text/xml',
        'Content-Length': xml.length,
      },
      auth: {
        user: conf.gmsuServer.login,
        pass: conf.gmsuServer.password,
      },
    };
    await SmsQueue.update(
      { status: 'sended' },
      {
        where: {
          sms_id: {
            $in: sms.map((v) => v.sms_id),
          },
        },
      },
    );

    const resp = await axios(obj);

    if (resp.statusCode >= 400) {
      console.log(resp.statusText);
    } else {
      for (let sms of sms) {
        if (waitingSmsQueueArray.has(sms)) continue;
        waitingSmsQueueArray.add(sms);
      }
      schedulerChecker(true);
    }
  },
  false,
);

const scheduleCheck = cron.schedule(
  '0,10,20,30,40,50 * * * * *',
  async () => {
    if (waitingSmsQueueArray.size == 0) return schedulerChecker(false);

    let sms = [...waitingSmsQueueArray];
    waitingSmsQueueArray.clear();
    let objX = {
      GETSTATUS: {
        VERSION: '1.0',
        MSGID_LIST: {
          MSGID: sms.map((v) => v.sms_id),
        },
      },
    };
    let xml = builder.create(objX).end({ pretty: true });

    let obj = {
      url: `${conf.gmsuServer.url}/stat.php`,
      method: 'POST',
      body: xml,
      headers: {
        'Content-Type': 'text/xml',
        'Content-Length': xml.length,
      },
      auth: {
        user: conf.gmsuServer.login,
        pass: conf.gmsuServer.password,
      },
    };
    request(obj, function (err, resp, _body) {
      if (resp.statusCode >= 400) {
        console.log(resp);
      } else {
        let s = new Readable();
        s.push(resp.body);
        s.push(null);
        let xmlS = new XmlStream(s);
        xmlS.preserve('STATUSRETURN');
        xmlS.on('endElement: STATUSRETURN', async function (item) {
          // console.log(item.STATUS_LIST);
          for (let sms of item.STATUS_LIST.$children) {
            let errorText = [
              'Internal error: Timeout',
              'Internal error: Invalid message',
              'Internal error: Unknown',
              'Internal error: REJECTED',
              'External error: Enroute',
              'External error: Expired',
              'External error: Deleted',
              'External error: Undeliverable',
              'External error: Rejected',
              'External error: Unknown',
            ];
            if (sms.MSGSTAT.$text == '4' || sms.MSGSTAT.$text == '2') {
              // console.log(sms);
              try {
                await SmsQueue.destroy({
                  where: {
                    sms_id: sms.MSGID.$text,
                  },
                });
              } catch (e) {
                console.error(e);
              }
              continue;
            }
            if ((sms.MSGSTAT.$text == '3' || sms.MSGSTAT.$text == '5') && errorText.includes(sms.REASON.$text)) {
              await SmsQueue.update(
                { status: 'rejected' },
                {
                  where: {
                    sms_id: sms.MSGID.$text,
                  },
                },
              );
              continue;
            }
            let s = { sms_id: sms.MSGID.$text };
            waitingSmsQueueArray.add(s);
          }
        });
      }
    });
  },
  false,
);

module.exports = { scheduler, schedulerChecker, schedulerSender };
