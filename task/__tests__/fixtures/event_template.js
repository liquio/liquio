const EVENT_TEMPLATE_FIXTURES = [
  {
    id: 31689002,
    event_type_id: 3,
    name: 'Відправка даних до ДСНС',
    description: '',
    json_schema:
      '{\n    "sendToExternalService": {\n        "providerName": "dsnsRmq",\n        "documentTemplateId": 31689002,\n        "method": "sendPackage",\n        "prepareData": "(document, documents, events) => {return documents.find(v => v.documentTemplateId === 31689002).data.data};"\n    },\n    "notFailOnError": false\n}',
    html_template: '',
    created_at: '2022-08-25T14:22:02.301Z',
    updated_at: '2022-08-25T14:22:02.301Z',
  },
];

module.exports = { EVENT_TEMPLATE_FIXTURES };
