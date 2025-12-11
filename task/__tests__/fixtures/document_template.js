const DOCUMENT_TEMPLATE_FIXTURES = [
  {
    id: 31689003,
    name: 'Збереження статусу',
    json_schema: JSON.stringify({
      title: 'Назва задачі',
      pdfRequired: false,
      signRequired: false,
      checkActive: '(documentData) => { return true; }',
      finalScreen: {
        title: 'Заголовок фінального екрану',
        subtitle: 'Текст фінального екрану',
      },
      calcTriggers: [],
      properties: {},
    }),
    html_template:
      '<!DOCTYPE html>\n<html lang="uk">\n    <head>\n        <meta charset="UTF-8">\n        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />\n    </head>\n    <body>\n        \n    </body>\n</html>',
    created_at: '2022-08-30T05:20:28.019Z',
    updated_at: '2022-08-30T05:20:28.019Z',
    access_json_schema: { inboxes: { workflowCreator: false }, workflowFiles: { workflowCreator: false } },
    additional_data_to_sign: null,
  },
  {
    id: 161243002,
    name: 'Нова задача',
    json_schema: JSON.stringify({
      title: 'Мультипідпис 2',
      type: 'object',
      pdfRequired: true,
      signRequired: true,
      calcTriggers: [],
      multisignCheck: {
        isEnabled: '(documentData) => documentData.isEnabled',
        excludeOwner: true,
        context: [],
        errors: [
          {
            title: 'Ваш КЕП не містить ЄДРПОУ компанії вказаний в заяві',
            text: 'будь ласка, підпишіть заяву ключем, який містить ЄДРПОУ компанії',
            check:
              '(documentData, context) => {const edrpouUser = context?.user?.edrpou;const userIpn = context?.user?.ipn;const signatureArray = documentData?.calculated?.signersArray;return userIpn !== signatureArray[0]?.ipn && edrpouUser?.length !== 8};',
          },
        ],
      },
      properties: {
        calculated: {
          type: 'object',
          description: 'Розрахунки',
          checkStepHidden: '() => true',
          properties: {
            ipn: {
              type: 'object',
              description: 'Дані таски 161019001',
              value: '({documents}) => \'3277334387\'',
              readOnly: true,
              hidden: true,
            },
            signersArray: {
              type: 'array',
              description: 'Масив підписантів',
              value:
                '() => [{firstName: \'Микола\',lastName: \'Тест\',middleName: \'Максимович\',ipn: \'8888888888\',email: \'gogigogotes.t.987789987789987789@gmail.com\'}, {firstName: \'Артур\',lastName: \'Тестрибаков\',middleName: \'Андрійович\',ipn: \'5421463126\',email: \'johnsnow698754999@gmail.com\'}];',
              hidden: true,
            },
          },
        },
        documentInfo: {
          type: 'object',
          description: '',
          properties: {
            signatureList: {
              type: 'array',
              description: 'Підписанти',
              control: 'signer.list',
              calcSigners: '(document) => document?.data?.calculated?.signersArray;',
              letterTitle: '(document) => `Заява на редагування спортивної споруди № очікує вашого підпису`;',
              letterTemplate:
                '(document, firstName, lastName, middleName, ipn, email, signerUrl) => `<div style=\'font-size:20px\'> <p>👋 Вітаємо, !</p> <p>Уповноваженою особою було створено заяву на редагування спортивної споруди № .  Будь ласка, <a href=\'${signerUrl}\' target=\'_blank\'>затвердіть заяву</a>, наклавши електронний підпис.</p> </div>`;',
              rejectSignLetterTitle: '(document) => `Підписання заяви на редагування спортивної споруди №  відхилено`;',
              rejectSignLetterTemplate:
                '(document, firstName, lastName, middleName, ipn, email, userId) => `<div style=\'font-size:20px\'> <p>👋 Вітаємо, !</p></div>`;',
              cancelSignsLetterTitle:
                '(document) => {const workflowNumber = document?.data?.calculated?.workflowNumber;return `Підписання заяви на редагування спортивної споруди № ${workflowNumber} відкликано`};',
              cancelSignsLetterTemplate:
                '(document, firstName, lastName, middleName, ipn, email, signerUrl) => `<div style=\'font-size:20px\'> <p>👋 Вітаємо,!</p> <p> відкликав заяву на редагування спортивної споруди № , тому заяву було анульовано. Ви можете звернутись до заявника за деталями або подати заяву самостійно.</p> </div>`;',
              templateId: 1,
            },
          },
        },
      },
    }),
    html_template:
      '<!DOCTYPE html>\n<html lang="uk">\n  <head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />\n    <style>\n      body {\n        font-size: 12px;\n        margin: 0;\n        font-family: \'e-Ukraine\', Arial, Helvetica, sans-serif;\n        line-height: 1;\n        padding-right: 80px;\n        padding-left: 80px;\n        padding-top: 56px;\n        padding-bottom: 56px;\n        letter-spacing: -0.02em;\n      }\n      @font-face {\n        font-family: uaFontReg;\n        src: url(https://my.diia.gov.ua/fonts/e-Ukraine-Regular.woff);\n      }\n    </style>\n  </head>\n  <body style="font-family: uaFontReg">\n    <div>Задача 2</div>\n  </body>\n</html>',
    created_at: '2024-05-30T12:35:43.079Z',
    updated_at: '2024-05-30T12:35:43.079Z',
    access_json_schema: { inboxes: { workflowCreator: false }, workflowFiles: { workflowCreator: false } },
    additional_data_to_sign: null,
  },
];

module.exports = { DOCUMENT_TEMPLATE_FIXTURES };
