const TASK_TEMPLATE_FIXTURES = [
  {
    id: 31689003,
    name: 'Збереження статусу',
    document_template_id: 31689003,
    json_schema:
      '{\n    "allowCopy": false,\n    "setPermissions": [\n        {\n            "performerUsers": [\n                "test"\n            ]\n        }\n    ]\n}',
    html_template:
      '<!DOCTYPE html>\n<html lang="uk">\n    <head>\n        <meta charset="UTF-8">\n        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />\n    </head>\n    <body>\n        \n    </body>\n</html>',
    created_at: '2022-08-30T05:20:28.020Z',
    updated_at: '2022-08-30T05:20:28.020Z',
  },
  {
    id: 161243102,
    name: 'Нова задача',
    document_template_id: 161243102,
    json_schema: JSON.stringify({}),
    html_template:
      '<!DOCTYPE html>\n<html lang="uk">\n    <head>\n        <meta charset="UTF-8">\n        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />\n    </head>\n    <body>\n        \n    </body>\n</html>',
    created_at: '2023-02-14T14:02:01.867Z',
    updated_at: '2023-02-14T14:02:01.867Z',
  },
];

module.exports = { TASK_TEMPLATE_FIXTURES };
