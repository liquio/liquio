-- Task type.
INSERT INTO public.task_types
(id, "name", created_at, updated_at)
VALUES(2, 'Видача дозволу', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');

-- Task template.
INSERT INTO public.task_templates
(id, "name", task_type_id, document_template_id, json_schema, html_template, created_at, updated_at)
VALUES(4, 'Заявка на дозвіл на викид забруднюючої речовини', 2, 4, '{}', '', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.task_templates
(id, "name", task_type_id, document_template_id, json_schema, html_template, created_at, updated_at)
VALUES(5, 'Реєстрація заявки', 2, 5, '{}', '', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.task_templates
(id, "name", task_type_id, document_template_id, json_schema, html_template, created_at, updated_at)
VALUES(6, 'Перевірка заявки', 2, 6, '{}', '', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.task_templates
(id, "name", task_type_id, document_template_id, json_schema, html_template, created_at, updated_at)
VALUES(7, 'Реєстрація негативної відповіді', 2, 7, '{}', '', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.task_templates
(id, "name", task_type_id, document_template_id, json_schema, html_template, created_at, updated_at)
VALUES(8, 'Перегляд негативної відповіді', 2, 8, '{}', '', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.task_templates
(id, "name", task_type_id, document_template_id, json_schema, html_template, created_at, updated_at)
VALUES(9, 'Передача в ДСЕС', 2, 9, '{}', '', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.task_templates
(id, "name", task_type_id, document_template_id, json_schema, html_template, created_at, updated_at)
VALUES(10, 'Результат висновку ДСЕС', 2, 10, '{}', '', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.task_templates
(id, "name", task_type_id, document_template_id, json_schema, html_template, created_at, updated_at)
VALUES(11, 'Реєстрація негативної відповіді ДСЕС', 2, 11, '{}', '', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.task_templates
(id, "name", task_type_id, document_template_id, json_schema, html_template, created_at, updated_at)
VALUES(12, 'Перегляд негативної відповіді ДСЕС', 2, 12, '{}', '', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.task_templates
(id, "name", task_type_id, document_template_id, json_schema, html_template, created_at, updated_at)
VALUES(13, 'Генерація проекту дозволу', 2, 13, '{}', '', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.task_templates
(id, "name", task_type_id, document_template_id, json_schema, html_template, created_at, updated_at)
VALUES(14, 'Передача підписаного дозволу', 2, 14, '{}', '', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.task_templates
(id, "name", task_type_id, document_template_id, json_schema, html_template, created_at, updated_at)
VALUES(15, 'Надати дозвіл замовнику', 2, 15, '{}', '', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');

-- Document category.
INSERT INTO public.document_categories
(id, "name", created_at, updated_at)
VALUES(2, 'Заяви користувача', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_categories
(id, "name", created_at, updated_at)
VALUES(3, 'Документи реєстратора', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_categories
(id, "name", created_at, updated_at)
VALUES(4, 'Документи модератора', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');

-- Document type.
INSERT INTO public.document_types
(id, "name", document_category_id, created_at, updated_at)
VALUES(4, 'Заявка на дозвіл на викид забруднюючої речовини', 2, '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_types
(id, "name", document_category_id, created_at, updated_at)
VALUES(5, 'Реєстрація заявки', 3, '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_types
(id, "name", document_category_id, created_at, updated_at)
VALUES(6, 'Перевірка заявки', 4, '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_types
(id, "name", document_category_id, created_at, updated_at)
VALUES(7, 'Реєстрація негативної відповіді', 4, '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_types
(id, "name", document_category_id, created_at, updated_at)
VALUES(8, 'Перегляд негативної відповіді', 2, '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_types
(id, "name", document_category_id, created_at, updated_at)
VALUES(9, 'Передача в ДСЕС', 4, '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_types
(id, "name", document_category_id, created_at, updated_at)
VALUES(10, 'Результат висновку ДСЕС', 4, '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_types
(id, "name", document_category_id, created_at, updated_at)
VALUES(11, 'Реєстрація негативної відповіді ДСЕС', 4, '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_types
(id, "name", document_category_id, created_at, updated_at)
VALUES(12, 'Перегляд негативної відповіді ДСЕС', 2, '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_types
(id, "name", document_category_id, created_at, updated_at)
VALUES(13, 'Генерація проекту дозволу', 4, '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_types
(id, "name", document_category_id, created_at, updated_at)
VALUES(14, 'Передача підписаного дозволу', 4, '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_types
(id, "name", document_category_id, created_at, updated_at)
VALUES(15, 'Надати дозвіл замовнику', 3, '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');

-- Document template.
INSERT INTO public.document_templates
(id, "name", document_type_id, json_schema, html_template, created_at, updated_at)
VALUES(4, 'Заявка на дозвіл на викид забруднюючої речовини', 4, '{
  "title": "Заявка на дозвіл на викид забруднюючої речовини",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''applicant'', ''form'', ''attachments'']; }",
  "properties": {
    "applicant": {
      "type": "object",
      "description": "Заявник",
      "control": "select.user",
      "tabs": [
        {
          "id": 1,
          "description": "Фізична особа",
          "set": [
            {
              "key": "isLegal",
              "value": false
            }
          ]
        },
        {
          "id": 2,
          "description": "Юридична особа",
          "set": [
            {
              "key": "isLegal",
              "value": true
            }
          ]
        }
      ],
      "properties": {
        "id": {
          "type": "string",
          "value": "user.id",
          "readonly": true,
          "hidden": true,
          "tabsIds": [
            1,
            2
          ]
        },
        "isLegal": {
          "type": "boolean",
          "value": "user.isLegal",
          "readonly": false,
          "hidden": true,
          "description": "Ознака юридичної особи",
          "tabsIds": [
            1,
            2
          ]
        },
        "name": {
          "type": "string",
          "value": "user.name",
          "description": "Прізвище, ім''я та по батькові",
          "readonly": true,
          "tabsIds": [
            1
          ]
        },
        "companyName": {
          "type": "string",
          "value": "user.companyName",
          "description": "Назва компанії",
          "readonly": true,
          "tabsIds": [
            2
          ]
        },
        "email": {
          "type": "string",
          "value": "user.email",
          "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]+$",
          "sample": "Електронна адреса має бути в форматі \"test@example.com\"",
          "description": "Електронна пошта",
          "tabsIds": [
            1,
            2
          ]
        },
        "phone": {
          "type": "string",
          "value": "user.phone",
          "pattern": "^380[0-9]{9}$",
          "sample": "Номер у форматі 380XXXXXXXXX",
          "description": "Контактний номер телефону",
          "mask": "380999999999",
          "tabsIds": [
            1,
            2
          ]
        },
        "address": {
          "type": "string",
          "value": "user.address",
          "minLength": 1,
          "maxLength": 500,
          "description": "Адреса",
          "sample": "Адреса, не більше 500 символів",
          "tabsIds": [
            1,
            2
          ]
        },
        "ipn": {
          "type": "string",
          "value": "user.ipn",
          "description": "РНОКПП",
          "readonly": true,
          "tabsIds": [
            1
          ]
        },
        "edrpou": {
          "type": "string",
          "value": "user.edrpou",
          "description": "ЄДРПОУ",
          "readonly": true,
          "tabsIds": [
            2
          ]
        }
      },
      "required": [
        "name",
        "companyName",
        "ipn",
        "edrpou",
        "address"
      ]
    },
    "form": {
      "type": "object",
      "description": "Текст заяви",
      "properties": {
        "text": {
          "type": "string",
          "control": "textArea",
          "sample": "Опишіть суть заяви",
          "hint": "Прошу дозволити викидати забруднюючі речовини.",
          "minLength": 10,
          "maxLength": 50000
        }
      },
      "required": [
        "text"
      ]
    },
    "attachments": {
      "type": "array",
      "description": "Додатки",
      "addItem": {
        "text": "Завантажити додатки до заяви"
      },
      "control": "select.files",
      "accept": "image/*,application/pdf",
      "maxSize": 10485760,
      "sample": "Документи що підтверджують необхідність викиду небезпечних речовин",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "attachType": {
            "type": "string",
            "control": "select.attachType",
            "dictionary": "attachTypes"
          },
          "id": {
            "type": "string",
            "control": "input.file"
          },
          "type": {
            "type": "string",
            "dictionary": "attachMimeTypes",
            "hidden": true
          },
          "size": {
            "type": "integer"
          }
        },
        "required": [
          "name",
          "id",
          "type"
        ]
      }
    }
  },
  "required": [
    "applicant",
    "form"
  ]
}', '<html></html>', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_templates
(id, "name", document_type_id, json_schema, html_template, created_at, updated_at)
VALUES(5, 'Реєстрація заявки', 5, '{
  "title": "Реєстрація заявки",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''register'', ''registration'']; }",
  "properties": {
    "register": {
      "type": "object",
      "description": "Реєстратор",
      "control": "select.user",
      "properties": {
        "id": {
          "type": "string",
          "value": "user.id",
          "readonly": true,
          "hidden": true
        },
        "name": {
          "type": "string",
          "value": "user.name",
          "description": "Прізвище, ім''я та по батькові",
          "readonly": true
        },
        "email": {
          "type": "string",
          "value": "user.email",
          "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]+$",
          "sample": "Електронна адреса має бути в форматі \"test@example.com\"",
          "description": "Електронна пошта"
        },
        "phone": {
          "type": "string",
          "value": "user.phone",
          "pattern": "^380[0-9]{9}$",
          "sample": "Номер у форматі 380XXXXXXXXX",
          "description": "Контактний номер телефону",
          "mask": "380999999999"
        },
        "address": {
          "type": "string",
          "value": "user.address",
          "minLength": 1,
          "maxLength": 500,
          "description": "Адреса",
          "sample": "Адреса, не більше 500 символів"
        },
        "ipn": {
          "type": "string",
          "value": "user.ipn",
          "description": "РНОКПП",
          "readonly": true
        }
      },
      "required": [
        "name"
      ]
    },
    "registration": {
      "type": "object",
      "description": "Реєстрація",
      "properties": {
        "number": {
          "type": "string",
          "description": "Реєстраційний номер",
          "sample": "Реєстраційний номер має бути в форматі \"20XX-XXXXXX\"",
          "mask": "2099-999999"
        }
      },
      "required": [
        "number"
      ]
    }
  },
  "required": [
    "register",
    "registration"
  ]
}', '<html></html>', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_templates
(id, "name", document_type_id, json_schema, html_template, created_at, updated_at)
VALUES(6, 'Перевірка заявки', 6, '{
  "title": "Перевірка заявки",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''moderator'', ''moderation'']; }",
  "properties": {
    "moderator": {
      "type": "object",
      "description": "Модератор",
      "control": "select.user",
      "properties": {
        "id": {
          "type": "string",
          "value": "user.id",
          "readonly": true,
          "hidden": true
        },
        "name": {
          "type": "string",
          "value": "user.name",
          "description": "Прізвище, ім''я та по батькові",
          "readonly": true
        },
        "email": {
          "type": "string",
          "value": "user.email",
          "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]+$",
          "sample": "Електронна адреса має бути в форматі \"test@example.com\"",
          "description": "Електронна пошта"
        },
        "phone": {
          "type": "string",
          "value": "user.phone",
          "pattern": "^380[0-9]{9}$",
          "sample": "Номер у форматі 380XXXXXXXXX",
          "description": "Контактний номер телефону",
          "mask": "380999999999"
        },
        "address": {
          "type": "string",
          "value": "user.address",
          "minLength": 1,
          "maxLength": 500,
          "description": "Адреса",
          "sample": "Адреса, не більше 500 символів"
        },
        "ipn": {
          "type": "string",
          "value": "user.ipn",
          "description": "РНОКПП",
          "readonly": true
        }
      },
      "required": [
        "name"
      ]
    },
    "moderation": {
      "type": "object",
      "description": "Модерація",
      "properties": {
        "approved": {
          "type": "boolean",
          "description": "Підтверджено"
        }
      },
      "required": [
        "approved"
      ]
    }
  },
  "required": [
    "moderator",
    "moderation"
  ]
}', '<html></html>', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_templates
(id, "name", document_type_id, json_schema, html_template, created_at, updated_at)
VALUES(7, 'Реєстрація негативної відповіді', 7, '{
  "title": "Реєстрація негативної відповіді",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''moderator'', ''cancellation'']; }",
  "properties": {
    "moderator": {
      "type": "object",
      "description": "Модератор",
      "control": "select.user",
      "properties": {
        "id": {
          "type": "string",
          "value": "user.id",
          "readonly": true,
          "hidden": true
        },
        "name": {
          "type": "string",
          "value": "user.name",
          "description": "Прізвище, ім''я та по батькові",
          "readonly": true
        },
        "email": {
          "type": "string",
          "value": "user.email",
          "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]+$",
          "sample": "Електронна адреса має бути в форматі \"test@example.com\"",
          "description": "Електронна пошта"
        },
        "phone": {
          "type": "string",
          "value": "user.phone",
          "pattern": "^380[0-9]{9}$",
          "sample": "Номер у форматі 380XXXXXXXXX",
          "description": "Контактний номер телефону",
          "mask": "380999999999"
        },
        "address": {
          "type": "string",
          "value": "user.address",
          "minLength": 1,
          "maxLength": 500,
          "description": "Адреса",
          "sample": "Адреса, не більше 500 символів"
        },
        "ipn": {
          "type": "string",
          "value": "user.ipn",
          "description": "РНОКПП",
          "readonly": true
        }
      },
      "required": [
        "name"
      ]
    },
    "cancellation": {
      "type": "object",
      "description": "Причини відмови",
      "properties": {
        "text": {
          "type": "string",
          "control": "textArea",
          "sample": "Опишіть причини відмови",
          "hint": "Відмовлено у зв''язку з недостатньо чітко сформульованими причинами.",
          "minLength": 10,
          "maxLength": 50000
        }
      },
      "required": [
        "text"
      ]
    }
  },
  "required": [
    "moderator",
    "cancellation"
  ]
}', '<html></html>', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_templates
(id, "name", document_type_id, json_schema, html_template, created_at, updated_at)
VALUES(8, 'Перегляд негативної відповіді', 8, '{
  "title": "Перегляд негативної відповіді",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''cancellation'']; }",
  "properties": {
    "cancellation": {
      "type": "object",
      "description": "Причини відмови",
      "properties": {
        "text": {
          "type": "string",
          "control": "textArea",
          "sample": "Описані причини відмови",
          "value": "documents.7.data.cancellation.text",
          "readonly": true
        }
      },
      "required": [
        "text"
      ]
    }
  },
  "required": [
    "cancellation"
  ]
}', '<html></html>', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_templates
(id, "name", document_type_id, json_schema, html_template, created_at, updated_at)
VALUES(9, 'Передача в ДСЕС', 9, '{
  "title": "Передача в ДСЕС",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''moderator'', ''userDocument'', ''form'', ''attachments'']; }",
  "properties": {
    "moderator": {
      "type": "object",
      "description": "Модератор",
      "control": "select.user",
      "properties": {
        "id": {
          "type": "string",
          "value": "user.id",
          "readonly": true,
          "hidden": true
        },
        "name": {
          "type": "string",
          "value": "user.name",
          "description": "Прізвище, ім''я та по батькові",
          "readonly": true
        },
        "email": {
          "type": "string",
          "value": "user.email",
          "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]+$",
          "sample": "Електронна адреса має бути в форматі \"test@example.com\"",
          "description": "Електронна пошта"
        },
        "phone": {
          "type": "string",
          "value": "user.phone",
          "pattern": "^380[0-9]{9}$",
          "sample": "Номер у форматі 380XXXXXXXXX",
          "description": "Контактний номер телефону",
          "mask": "380999999999"
        },
        "address": {
          "type": "string",
          "value": "user.address",
          "minLength": 1,
          "maxLength": 500,
          "description": "Адреса",
          "sample": "Адреса, не більше 500 символів"
        },
        "ipn": {
          "type": "string",
          "value": "user.ipn",
          "description": "РНОКПП",
          "readonly": true
        }
      },
      "required": [
        "name"
      ]
    },
    "userDocument": {
      "type": "object",
      "description": "Заявка користувача",
      "properties": {
        "documentPreview": {
          "type": "object",
          "control": "preview.document",
          "documentTemplateId": 4
        }
      }
    },
    "form": {
      "type": "object",
      "description": "Опис",
      "properties": {
        "text": {
          "type": "string",
          "control": "textArea",
          "sample": "Опишіть передані документи",
          "maxLength": 50000
        }
      },
      "required": [
        "text"
      ]
    },
    "attachments": {
      "type": "array",
      "description": "Додатки",
      "addItem": {
        "text": "Завантажити додатки"
      },
      "control": "select.files",
      "accept": "image/*,application/pdf",
      "maxSize": 10485760,
      "sample": "Документи що передаються на розгляд",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "attachType": {
            "type": "string",
            "control": "select.attachType",
            "dictionary": "attachTypes"
          },
          "id": {
            "type": "string",
            "control": "input.file"
          },
          "type": {
            "type": "string",
            "dictionary": "attachMimeTypes",
            "hidden": true
          },
          "size": {
            "type": "integer"
          }
        },
        "required": [
          "name",
          "id",
          "type"
        ]
      }
    }
  },
  "required": [
    "moderator",
    "form"
  ]
}', '<html></html>', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_templates
(id, "name", document_type_id, json_schema, html_template, created_at, updated_at)
VALUES(10, 'Результат висновку ДСЕС', 10, '{
  "title": "Результат висновку ДСЕС",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''moderator'', ''form'', ''attachments'']; }",
  "properties": {
    "moderator": {
      "type": "object",
      "description": "Модератор",
      "control": "select.user",
      "properties": {
        "id": {
          "type": "string",
          "value": "user.id",
          "readonly": true,
          "hidden": true
        },
        "name": {
          "type": "string",
          "value": "user.name",
          "description": "Прізвище, ім''я та по батькові",
          "readonly": true
        },
        "email": {
          "type": "string",
          "value": "user.email",
          "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]+$",
          "sample": "Електронна адреса має бути в форматі \"test@example.com\"",
          "description": "Електронна пошта"
        },
        "phone": {
          "type": "string",
          "value": "user.phone",
          "pattern": "^380[0-9]{9}$",
          "sample": "Номер у форматі 380XXXXXXXXX",
          "description": "Контактний номер телефону",
          "mask": "380999999999"
        },
        "address": {
          "type": "string",
          "value": "user.address",
          "minLength": 1,
          "maxLength": 500,
          "description": "Адреса",
          "sample": "Адреса, не більше 500 символів"
        },
        "ipn": {
          "type": "string",
          "value": "user.ipn",
          "description": "РНОКПП",
          "readonly": true
        }
      },
      "required": [
        "name"
      ]
    },
    "form": {
      "type": "object",
      "description": "Висновок",
      "properties": {
        "text": {
          "type": "string",
          "control": "textArea",
          "sample": "Висновок ДСЕС",
          "maxLength": 50000
        },
        "approved": {
          "type": "boolean",
          "description": "Підтверджено"
        }
      },
      "required": [
        "text",
        "approved"
      ]
    },
    "attachments": {
      "type": "array",
      "description": "Додатки",
      "addItem": {
        "text": "Завантажити додатки"
      },
      "control": "select.files",
      "accept": "image/*,application/pdf",
      "maxSize": 10485760,
      "sample": "Документи що передаються на розгляд",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "attachType": {
            "type": "string",
            "control": "select.attachType",
            "dictionary": "attachTypes"
          },
          "id": {
            "type": "string",
            "control": "input.file"
          },
          "type": {
            "type": "string",
            "dictionary": "attachMimeTypes",
            "hidden": true
          },
          "size": {
            "type": "integer"
          }
        },
        "required": [
          "name",
          "id",
          "type"
        ]
      }
    }
  },
  "required": [
    "moderator",
    "form"
  ]
}', '<html></html>', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_templates
(id, "name", document_type_id, json_schema, html_template, created_at, updated_at)
VALUES(11, 'Реєстрація негативної відповіді ДСЕС', 11, '{
  "title": "Реєстрація негативної відповіді ДСЕС",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''moderator'', ''cancellation'']; }",
  "properties": {
    "moderator": {
      "type": "object",
      "description": "Модератор",
      "control": "select.user",
      "properties": {
        "id": {
          "type": "string",
          "value": "user.id",
          "readonly": true,
          "hidden": true
        },
        "name": {
          "type": "string",
          "value": "user.name",
          "description": "Прізвище, ім''я та по батькові",
          "readonly": true
        },
        "email": {
          "type": "string",
          "value": "user.email",
          "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]+$",
          "sample": "Електронна адреса має бути в форматі \"test@example.com\"",
          "description": "Електронна пошта"
        },
        "phone": {
          "type": "string",
          "value": "user.phone",
          "pattern": "^380[0-9]{9}$",
          "sample": "Номер у форматі 380XXXXXXXXX",
          "description": "Контактний номер телефону",
          "mask": "380999999999"
        },
        "address": {
          "type": "string",
          "value": "user.address",
          "minLength": 1,
          "maxLength": 500,
          "description": "Адреса",
          "sample": "Адреса, не більше 500 символів"
        },
        "ipn": {
          "type": "string",
          "value": "user.ipn",
          "description": "РНОКПП",
          "readonly": true
        }
      },
      "required": [
        "name"
      ]
    },
    "cancellation": {
      "type": "object",
      "description": "Причини відмови",
      "properties": {
        "text": {
          "type": "string",
          "control": "textArea",
          "sample": "Опишіть причини відмови",
          "hint": "Відмовлено ДСЕС у зв''язку з недостатньо чітко сформульованими причинами.",
          "minLength": 10,
          "maxLength": 50000
        }
      },
      "required": [
        "text"
      ]
    }
  },
  "required": [
    "moderator",
    "cancellation"
  ]
}', '<html></html>', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_templates
(id, "name", document_type_id, json_schema, html_template, created_at, updated_at)
VALUES(12, 'Перегляд негативної відповіді ДСЕС', 12, '{
  "title": "Перегляд негативної відповіді ДСЕС",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''cancellation'']; }",
  "properties": {
    "cancellation": {
      "type": "object",
      "description": "Причини відмови",
      "properties": {
        "text": {
          "type": "string",
          "control": "textArea",
          "sample": "Описані причини відмови ДСЕС",
          "value": "documents.11.data.cancellation.text",
          "readonly": true
        }
      },
      "required": [
        "text"
      ]
    }
  },
  "required": [
    "cancellation"
  ]
}', '<html></html>', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_templates
(id, "name", document_type_id, json_schema, html_template, created_at, updated_at)
VALUES(13, 'Генерація проекту дозволу', 13, '{
  "title": "Генерація проекту дозволу",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''moderator'', ''form'']; }",
  "properties": {
    "moderator": {
      "type": "object",
      "description": "Модератор",
      "control": "select.user",
      "properties": {
        "id": {
          "type": "string",
          "value": "user.id",
          "readonly": true,
          "hidden": true
        },
        "name": {
          "type": "string",
          "value": "user.name",
          "description": "Прізвище, ім''я та по батькові",
          "readonly": true
        },
        "email": {
          "type": "string",
          "value": "user.email",
          "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]+$",
          "sample": "Електронна адреса має бути в форматі \"test@example.com\"",
          "description": "Електронна пошта"
        },
        "phone": {
          "type": "string",
          "value": "user.phone",
          "pattern": "^380[0-9]{9}$",
          "sample": "Номер у форматі 380XXXXXXXXX",
          "description": "Контактний номер телефону",
          "mask": "380999999999"
        },
        "address": {
          "type": "string",
          "value": "user.address",
          "minLength": 1,
          "maxLength": 500,
          "description": "Адреса",
          "sample": "Адреса, не більше 500 символів"
        },
        "ipn": {
          "type": "string",
          "value": "user.ipn",
          "description": "РНОКПП",
          "readonly": true
        }
      },
      "required": [
        "name"
      ]
    },
    "form": {
      "type": "object",
      "description": "Проект дозволу",
      "properties": {
        "resolutionProject": {
          "type": "string",
          "control": "textArea",
          "sample": "Текст дозволу",
          "hint": "Дозволено викидати забруднюючі речовини.",
          "minLength": 10
        }
      },
      "required": [
        "resolutionProject"
      ]
    }
  },
  "required": [
    "moderator",
    "form"
  ]
}', '<html></html>', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_templates
(id, "name", document_type_id, json_schema, html_template, created_at, updated_at)
VALUES(14, 'Передача підписаного дозволу', 14, '{
  "title": "Передача підписаного дозволу",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''moderator'', ''resolution'', ''form'', ''attachments'']; }",
  "properties": {
    "moderator": {
      "type": "object",
      "description": "Модератор",
      "control": "select.user",
      "properties": {
        "id": {
          "type": "string",
          "value": "user.id",
          "readonly": true,
          "hidden": true
        },
        "name": {
          "type": "string",
          "value": "user.name",
          "description": "Прізвище, ім''я та по батькові",
          "readonly": true
        },
        "email": {
          "type": "string",
          "value": "user.email",
          "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]+$",
          "sample": "Електронна адреса має бути в форматі \"test@example.com\"",
          "description": "Електронна пошта"
        },
        "phone": {
          "type": "string",
          "value": "user.phone",
          "pattern": "^380[0-9]{9}$",
          "sample": "Номер у форматі 380XXXXXXXXX",
          "description": "Контактний номер телефону",
          "mask": "380999999999"
        },
        "address": {
          "type": "string",
          "value": "user.address",
          "minLength": 1,
          "maxLength": 500,
          "description": "Адреса",
          "sample": "Адреса, не більше 500 символів"
        },
        "ipn": {
          "type": "string",
          "value": "user.ipn",
          "description": "РНОКПП",
          "readonly": true
        }
      },
      "required": [
        "name"
      ]
    },
    "resolution": {
      "type": "object",
      "description": "Проект дозволу",
      "properties": {
        "documentPreview": {
          "type": "object",
          "control": "preview.document",
          "documentTemplateId": 13
        }
      }
    },
    "form": {
      "type": "object",
      "description": "Дозвіл",
      "properties": {
        "resolution": {
          "type": "string",
          "control": "textArea",
          "sample": "Текст дозволу",
          "value": "documents.13.data.form.resolutionProject",
          "readonly": true
        },
        "sentDate": {
          "description": "Дата передачі на видачу замовнику",
          "type": "string",
          "control": "date"
        }
      },
      "required": [
        "text",
        "sentDate"
      ]
    },
    "attachments": {
      "type": "array",
      "description": "Додатки",
      "addItem": {
        "text": "Завантажити додатки щодо дозволу"
      },
      "control": "select.files",
      "accept": "image/*,application/pdf",
      "maxSize": 10485760,
      "sample": "Документи щодо дозволу",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "attachType": {
            "type": "string",
            "control": "select.attachType",
            "dictionary": "attachTypes"
          },
          "id": {
            "type": "string",
            "control": "input.file"
          },
          "type": {
            "type": "string",
            "dictionary": "attachMimeTypes",
            "hidden": true
          },
          "size": {
            "type": "integer"
          }
        },
        "required": [
          "name",
          "id",
          "type"
        ]
      }
    }
  },
  "required": [
    "moderator",
    "resolution",
    "form"
  ]
}', '<html></html>', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.document_templates
(id, "name", document_type_id, json_schema, html_template, created_at, updated_at)
VALUES(15, 'Надати дозвіл замовнику', 15, '{
  "title": "Надати дозвіл замовнику",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''register'', ''resolution'', ''provision'']; }",
  "properties": {
    "register": {
      "type": "object",
      "description": "Реєстратор",
      "control": "select.user",
      "properties": {
        "id": {
          "type": "string",
          "value": "user.id",
          "readonly": true,
          "hidden": true
        },
        "name": {
          "type": "string",
          "value": "user.name",
          "description": "Прізвище, ім''я та по батькові",
          "readonly": true
        },
        "email": {
          "type": "string",
          "value": "user.email",
          "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]+$",
          "sample": "Електронна адреса має бути в форматі \"test@example.com\"",
          "description": "Електронна пошта"
        },
        "phone": {
          "type": "string",
          "value": "user.phone",
          "pattern": "^380[0-9]{9}$",
          "sample": "Номер у форматі 380XXXXXXXXX",
          "description": "Контактний номер телефону",
          "mask": "380999999999"
        },
        "address": {
          "type": "string",
          "value": "user.address",
          "minLength": 1,
          "maxLength": 500,
          "description": "Адреса",
          "sample": "Адреса, не більше 500 символів"
        },
        "ipn": {
          "type": "string",
          "value": "user.ipn",
          "description": "РНОКПП",
          "readonly": true
        }
      },
      "required": [
        "name"
      ]
    },
    "resolution": {
      "type": "object",
      "description": "Дозвіл",
      "properties": {
        "documentPreview": {
          "type": "object",
          "control": "preview.document",
          "documentTemplateId": 14
        }
      }
    },
    "provision": {
      "type": "object",
      "description": "Надання замовнику",
      "properties": {
        "date": {
          "description": "Дата передачі замовнику",
          "type": "string",
          "control": "date"
        }
      }
    }
  },
  "required": [
    "register",
    "provision"
  ]
}', '<html></html>', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');

-- Gateway template.
INSERT INTO public.gateway_templates
(id, gateway_type_id, "name", json_schema, created_at, updated_at)
VALUES(3, 1, 'Перевірка', '{
  "formulas": [
    {
      "condition": "(documents) => { return documents.find(item => item.documentTemplateId === 6).data.moderation.approved; }",
      "isDefault": true
    },
    {
      "condition": "(documents) => { return !documents.find(item => item.documentTemplateId === 6).data.moderation.approved; }",
      "isDefault": false
    }
  ]
}', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.gateway_templates
(id, gateway_type_id, "name", json_schema, created_at, updated_at)
VALUES(4, 1, 'Перевірка', '{
  "formulas": [
    {
      "condition": "(documents) => { return documents.find(item => item.documentTemplateId === 10).data.form.approved; }",
      "isDefault": true
    },
    {
      "condition": "(documents) => { return !documents.find(item => item.documentTemplateId === 10).data.form.approved; }",
      "isDefault": false
    }
  ]
}', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');

-- Event template.
INSERT INTO public.event_templates
(id, event_type_id, "name", json_schema, created_at, updated_at)
VALUES(5, 1, 'Проінформувати користувача про відхилення', '{
  "phones": "(documents) => { const phone = documents.find(item => item.documentTemplateId === 4).data.applicant.phone; return phone ? [phone] : []; }",
  "emails": "(documents) => { const email = documents.find(item => item.documentTemplateId === 4).data.applicant.email; return email ? [email] : []; }",
  "phonesByUserId": "(documents) => { const userId = documents.find(item => item.documentTemplateId === 4).data.applicant.id; return userId ? [userId] : []; }",
  "emailsByUserId": "(documents) => { const userId = documents.find(item => item.documentTemplateId === 4).data.applicant.id; return userId ? [userId] : []; }",
  "shortText": "(documents) => { return ''Відмовлено в реєстрації.''; }",
  "fullText": "(documents) => { const userName = documents.find(item => item.documentTemplateId === 4).data.applicant.name; return ''Шановний <b>'' + (userName || ''користувач'') + ''</b>, в реєстрації вашої заявки відмовлено.''; }",
  "subject": "(documents) => { return ''Відмовлено в реєстрації''; }"
}', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.event_templates
(id, event_type_id, "name", json_schema, created_at, updated_at)
VALUES(6, 1, 'Проінформувати користувача про відхилення', '{
  "phones": "(documents) => { const phone = documents.find(item => item.documentTemplateId === 4).data.applicant.phone; return phone ? [phone] : []; }",
  "emails": "(documents) => { const email = documents.find(item => item.documentTemplateId === 4).data.applicant.email; return email ? [email] : []; }",
  "phonesByUserId": "(documents) => { const userId = documents.find(item => item.documentTemplateId === 4).data.applicant.id; return userId ? [userId] : []; }",
  "emailsByUserId": "(documents) => { const userId = documents.find(item => item.documentTemplateId === 4).data.applicant.id; return userId ? [userId] : []; }",
  "shortText": "(documents) => { return ''Відмовлено ДСЕС в реєстрації.''; }",
  "fullText": "(documents) => { const userName = documents.find(item => item.documentTemplateId === 4).data.applicant.name; return ''Шановний <b>'' + (userName || ''користувач'') + ''</b>, в реєстрації вашої заявки відмовлено ДСЕС.''; }",
  "subject": "(documents) => { return ''Відмовлено ДСЕС в реєстрації''; }"
}', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
INSERT INTO public.event_templates
(id, event_type_id, "name", json_schema, created_at, updated_at)
VALUES(7, 1, 'Проінформувати користувача про надання дозволу', '{
  "phones": "(documents) => { const phone = documents.find(item => item.documentTemplateId === 4).data.applicant.phone; return phone ? [phone] : []; }",
  "emails": "(documents) => { const email = documents.find(item => item.documentTemplateId === 4).data.applicant.email; return email ? [email] : []; }",
  "phonesByUserId": "(documents) => { const userId = documents.find(item => item.documentTemplateId === 4).data.applicant.id; return userId ? [userId] : []; }",
  "emailsByUserId": "(documents) => { const userId = documents.find(item => item.documentTemplateId === 4).data.applicant.id; return userId ? [userId] : []; }",
  "shortText": "(documents) => { return ''Дозвіл надано.''; }",
  "fullText": "(documents) => { const userName = documents.find(item => item.documentTemplateId === 4).data.applicant.name; return ''Шановний <b>'' + (userName || ''користувач'') + ''</b>, дозвіл згідно вашої заявки надано.''; }",
  "subject": "(documents) => { return ''Дозвіл надано''; }"
}', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');

-- Workflow template.
INSERT INTO public.workflow_templates
(id, "name", xml_bpmn_schema, data, created_at, updated_at)
VALUES(2, 'Видача дозволу на викиди забруднюючих речовин', '<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_1gy5wbz">
    <bpmn:participant id="Participant_1etspjk" name="Замовник" processRef="Process_1" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_0lwdfei">
      <bpmn:lane id="Lane_1vaul64">
        <bpmn:flowNodeRef>task-4</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-5</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-15</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>end-event-1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-8</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>end-event-2</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>gateway-3</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-7</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>event-5</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-9</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>gateway-4</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-10</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-11</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>event-6</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>end-event-3</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-12</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-13</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-14</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>event-7</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-6</bpmn:flowNodeRef>
        <bpmn:childLaneSet id="LaneSet_0ly8uvo">
          <bpmn:lane id="Lane_0m7xu78" name="Заявник">
            <bpmn:flowNodeRef>task-4</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>task-8</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>end-event-2</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>end-event-3</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>task-12</bpmn:flowNodeRef>
          </bpmn:lane>
          <bpmn:lane id="Lane_0gs3xtb" name="Єдине вікно">
            <bpmn:flowNodeRef>task-5</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>task-15</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>end-event-1</bpmn:flowNodeRef>
          </bpmn:lane>
          <bpmn:lane id="Lane_0pan2wd" name="Відповідальна особа">
            <bpmn:flowNodeRef>gateway-3</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>task-7</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>event-5</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>task-9</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>gateway-4</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>task-10</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>task-11</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>event-6</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>task-13</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>task-14</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>event-7</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>task-6</bpmn:flowNodeRef>
          </bpmn:lane>
        </bpmn:childLaneSet>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:task id="task-4" name="Заповнити форму заявки на послугу">
      <bpmn:incoming>SequenceFlow_0okhwkd</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_0dn8ydo</bpmn:outgoing>
    </bpmn:task>
    <bpmn:sequenceFlow id="SequenceFlow_0okhwkd" sourceRef="StartEvent_1" targetRef="task-4" />
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>SequenceFlow_0okhwkd</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:sequenceFlow id="SequenceFlow_0dn8ydo" sourceRef="task-4" targetRef="task-5" />
    <bpmn:task id="task-5" name="Зареєструвати надання документів та Заяви">
      <bpmn:incoming>SequenceFlow_0dn8ydo</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_1qb0tjv</bpmn:outgoing>
    </bpmn:task>
    <bpmn:sequenceFlow id="SequenceFlow_1qb0tjv" sourceRef="task-5" targetRef="task-6" />
    <bpmn:task id="task-15" name="Надати Дозвіл Замовнику">
      <bpmn:incoming>SequenceFlow_0caoj3i</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_1u2r1oo</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="end-event-1">
      <bpmn:incoming>SequenceFlow_1u2r1oo</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:task id="task-8" name="Отримати  інформацію про відмову">
      <bpmn:incoming>SequenceFlow_1nb9jlq</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_0a3q3sf</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="end-event-2">
      <bpmn:incoming>SequenceFlow_0a3q3sf</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:exclusiveGateway id="gateway-3" name="3">
      <bpmn:incoming>SequenceFlow_1wh1db4</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_07f8nwx</bpmn:outgoing>
      <bpmn:outgoing>SequenceFlow_1nxttoc</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:task id="task-7" name="Заеєструвати негативну  відповідь. ">
      <bpmn:incoming>SequenceFlow_1nxttoc</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_0ngejzk</bpmn:outgoing>
    </bpmn:task>
    <bpmn:intermediateThrowEvent id="event-5" name="Повідомити заявника про відхилення">
      <bpmn:incoming>SequenceFlow_0ngejzk</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_1nb9jlq</bpmn:outgoing>
      <bpmn:messageEventDefinition />
    </bpmn:intermediateThrowEvent>
    <bpmn:task id="task-9" name="Передати пакет документів у ДСЕС, ">
      <bpmn:incoming>SequenceFlow_07f8nwx</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_1cuvgq0</bpmn:outgoing>
    </bpmn:task>
    <bpmn:exclusiveGateway id="gateway-4" name="4">
      <bpmn:incoming>SequenceFlow_1hpgopn</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_1p9v791</bpmn:outgoing>
      <bpmn:outgoing>SequenceFlow_05mskbb</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:task id="task-10" name="Внести результати висновку ДСЕС">
      <bpmn:incoming>SequenceFlow_1cuvgq0</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_1hpgopn</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="task-11" name="Заеєструвати негативну відповідь">
      <bpmn:incoming>SequenceFlow_05mskbb</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_0z6el66</bpmn:outgoing>
    </bpmn:task>
    <bpmn:intermediateThrowEvent id="event-6" name="6">
      <bpmn:incoming>SequenceFlow_0z6el66</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_1pr35tn</bpmn:outgoing>
      <bpmn:messageEventDefinition />
    </bpmn:intermediateThrowEvent>
    <bpmn:endEvent id="end-event-3">
      <bpmn:incoming>SequenceFlow_0v1giz9</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:task id="task-12" name="Отримати інформацію про відмову">
      <bpmn:incoming>SequenceFlow_1pr35tn</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_0v1giz9</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="task-13" name="Згенекрувати Проект Дозволу \ Листа з зауваженнями. ">
      <bpmn:incoming>SequenceFlow_1p9v791</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_1uklpva</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="task-14" name="Передати підписаний Дозвіл для надання замовнику">
      <bpmn:incoming>SequenceFlow_1uklpva</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_0injoza</bpmn:outgoing>
    </bpmn:task>
    <bpmn:intermediateThrowEvent id="event-7" name="Повідомити про готовність Дозволу">
      <bpmn:incoming>SequenceFlow_0injoza</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_0caoj3i</bpmn:outgoing>
      <bpmn:messageEventDefinition />
    </bpmn:intermediateThrowEvent>
    <bpmn:sequenceFlow id="SequenceFlow_0caoj3i" sourceRef="event-7" targetRef="task-15" />
    <bpmn:sequenceFlow id="SequenceFlow_1u2r1oo" sourceRef="task-15" targetRef="end-event-1" />
    <bpmn:sequenceFlow id="SequenceFlow_1nb9jlq" sourceRef="event-5" targetRef="task-8" />
    <bpmn:sequenceFlow id="SequenceFlow_0a3q3sf" sourceRef="task-8" targetRef="end-event-2" />
    <bpmn:sequenceFlow id="SequenceFlow_1wh1db4" sourceRef="task-6" targetRef="gateway-3" />
    <bpmn:sequenceFlow id="SequenceFlow_07f8nwx" name="Так" sourceRef="gateway-3" targetRef="task-9" />
    <bpmn:sequenceFlow id="SequenceFlow_1nxttoc" name="Ні" sourceRef="gateway-3" targetRef="task-7" />
    <bpmn:sequenceFlow id="SequenceFlow_0ngejzk" sourceRef="task-7" targetRef="event-5" />
    <bpmn:sequenceFlow id="SequenceFlow_1cuvgq0" sourceRef="task-9" targetRef="task-10" />
    <bpmn:sequenceFlow id="SequenceFlow_1hpgopn" sourceRef="task-10" targetRef="gateway-4" />
    <bpmn:sequenceFlow id="SequenceFlow_05mskbb" name="Негативні" sourceRef="gateway-4" targetRef="task-11" />
    <bpmn:sequenceFlow id="SequenceFlow_1p9v791" name="Позитивні" sourceRef="gateway-4" targetRef="task-13" />
    <bpmn:sequenceFlow id="SequenceFlow_0z6el66" sourceRef="task-11" targetRef="event-6" />
    <bpmn:sequenceFlow id="SequenceFlow_1pr35tn" sourceRef="event-6" targetRef="task-12" />
    <bpmn:sequenceFlow id="SequenceFlow_0v1giz9" sourceRef="task-12" targetRef="end-event-3" />
    <bpmn:sequenceFlow id="SequenceFlow_1uklpva" sourceRef="task-13" targetRef="task-14" />
    <bpmn:sequenceFlow id="SequenceFlow_0injoza" sourceRef="task-14" targetRef="event-7" />
    <bpmn:task id="task-6" name="Перевірити зміст орігінальних документів">
      <bpmn:incoming>SequenceFlow_1qb0tjv</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_1wh1db4</bpmn:outgoing>
    </bpmn:task>
    <bpmn:association id="Association_0mols95" sourceRef="task-4" targetRef="TextAnnotation_1g298i3" />
    <bpmn:textAnnotation id="TextAnnotation_1g298i3">
      <bpmn:text>Перелік полів форми!!! Не відповідає переліку документів "книги" та інф.карті. До task входить: контроль повноти заповнення, контролт корректності даних, генерація Заяви за шаблоном, надання до Міністерства для розгляду</bpmn:text>
    </bpmn:textAnnotation>
    <bpmn:textAnnotation id="TextAnnotation_0shgjo0">
      <bpmn:text>Хто і іколи підписує оригінал документу - ПОЗА СИСТЕМОЮ</bpmn:text>
    </bpmn:textAnnotation>
    <bpmn:association id="Association_1tbyvrx" sourceRef="task-14" targetRef="TextAnnotation_0shgjo0" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1gy5wbz">
      <bpmndi:BPMNShape id="Participant_1etspjk_di" bpmnElement="Participant_1etspjk">
        <dc:Bounds x="634" y="-129" width="2243" height="651" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="744" y="-62" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task-4_di" bpmnElement="task-4">
        <dc:Bounds x="808" y="-84" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="TextAnnotation_1g298i3_di" bpmnElement="TextAnnotation_1g298i3">
        <dc:Bounds x="922" y="-18" width="91" height="292" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Association_0mols95_di" bpmnElement="Association_0mols95">
        <di:waypoint x="884" y="-4" />
        <di:waypoint x="922" y="59" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="Lane_1vaul64_di" bpmnElement="Lane_1vaul64">
        <dc:Bounds x="664" y="-129" width="2213" height="651" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_0m7xu78_di" bpmnElement="Lane_0m7xu78">
        <dc:Bounds x="694" y="-129" width="2183" height="183" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_0gs3xtb_di" bpmnElement="Lane_0gs3xtb">
        <dc:Bounds x="694" y="54" width="2183" height="184" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task-6_di" bpmnElement="task-6">
        <dc:Bounds x="1356" y="304" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="gateway-4_di" bpmnElement="gateway-4" isMarkerVisible="true">
        <dc:Bounds x="2007" y="376" width="50" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="2029" y="433" width="7" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task-11_di" bpmnElement="task-11">
        <dc:Bounds x="2107" y="227" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_05mskbb_di" bpmnElement="SequenceFlow_05mskbb">
        <di:waypoint x="2032" y="376" />
        <di:waypoint x="2032" y="267" />
        <di:waypoint x="2107" y="267" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="2039" y="322" width="50" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="task-9_di" bpmnElement="task-9">
        <dc:Bounds x="1625" y="361" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task-7_di" bpmnElement="task-7">
        <dc:Bounds x="1625" y="227" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end-event-2_di" bpmnElement="end-event-2">
        <dc:Bounds x="2112" y="-89" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task-13_di" bpmnElement="task-13">
        <dc:Bounds x="2180" y="361" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task-15_di" bpmnElement="task-15">
        <dc:Bounds x="2636" y="53" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end-event-1_di" bpmnElement="end-event-1">
        <dc:Bounds x="2758" y="75" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_1u2r1oo_di" bpmnElement="SequenceFlow_1u2r1oo">
        <di:waypoint x="2736" y="93" />
        <di:waypoint x="2758" y="93" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="task-10_di" bpmnElement="task-10">
        <dc:Bounds x="1841" y="361" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task-12_di" bpmnElement="task-12">
        <dc:Bounds x="2390" y="-111" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="IntermediateThrowEvent_0se47pq_di" bpmnElement="event-5">
        <dc:Bounds x="1826" y="249" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="1808" y="292" width="72" height="40" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_0okhwkd_di" bpmnElement="SequenceFlow_0okhwkd">
        <di:waypoint x="780" y="-44" />
        <di:waypoint x="808" y="-44" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="task-5_di" bpmnElement="task-5">
        <dc:Bounds x="1095" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_0pan2wd_di" bpmnElement="Lane_0pan2wd">
        <dc:Bounds x="694" y="238" width="2183" height="284" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_1qb0tjv_di" bpmnElement="SequenceFlow_1qb0tjv">
        <di:waypoint x="1195" y="120" />
        <di:waypoint x="1268" y="120" />
        <di:waypoint x="1268" y="344" />
        <di:waypoint x="1356" y="344" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="gateway-3_di" bpmnElement="gateway-3" isMarkerVisible="true">
        <dc:Bounds x="1556" y="319" width="50" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="1616" y="337" width="7" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_1wh1db4_di" bpmnElement="SequenceFlow_1wh1db4">
        <di:waypoint x="1456" y="344" />
        <di:waypoint x="1556" y="344" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_07f8nwx_di" bpmnElement="SequenceFlow_07f8nwx">
        <di:waypoint x="1581" y="369" />
        <di:waypoint x="1581" y="401" />
        <di:waypoint x="1625" y="401" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="1587" y="382" width="18" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_1nxttoc_di" bpmnElement="SequenceFlow_1nxttoc">
        <di:waypoint x="1581" y="319" />
        <di:waypoint x="1581" y="267" />
        <di:waypoint x="1625" y="267" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="1591" y="290" width="11" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_0ngejzk_di" bpmnElement="SequenceFlow_0ngejzk">
        <di:waypoint x="1725" y="267" />
        <di:waypoint x="1826" y="267" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="task-8_di" bpmnElement="task-8">
        <dc:Bounds x="1952" y="-111" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_1nb9jlq_di" bpmnElement="SequenceFlow_1nb9jlq">
        <di:waypoint x="1862" y="267" />
        <di:waypoint x="1911" y="267" />
        <di:waypoint x="1911" y="-71" />
        <di:waypoint x="1952" y="-71" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_0a3q3sf_di" bpmnElement="SequenceFlow_0a3q3sf">
        <di:waypoint x="2052" y="-71" />
        <di:waypoint x="2112" y="-71" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_1cuvgq0_di" bpmnElement="SequenceFlow_1cuvgq0">
        <di:waypoint x="1725" y="401" />
        <di:waypoint x="1841" y="401" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_1hpgopn_di" bpmnElement="SequenceFlow_1hpgopn">
        <di:waypoint x="1941" y="401" />
        <di:waypoint x="2007" y="401" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_0z6el66_di" bpmnElement="SequenceFlow_0z6el66">
        <di:waypoint x="2207" y="267" />
        <di:waypoint x="2285" y="267" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="IntermediateThrowEvent_00o1oy8_di" bpmnElement="event-6">
        <dc:Bounds x="2285" y="249" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="2300" y="292" width="7" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_1p9v791_di" bpmnElement="SequenceFlow_1p9v791">
        <di:waypoint x="2057" y="401" />
        <di:waypoint x="2180" y="401" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="2086" y="385" width="52" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_1pr35tn_di" bpmnElement="SequenceFlow_1pr35tn">
        <di:waypoint x="2321" y="267" />
        <di:waypoint x="2342" y="267" />
        <di:waypoint x="2342" y="-71" />
        <di:waypoint x="2390" y="-71" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="end-event-3_di" bpmnElement="end-event-3">
        <dc:Bounds x="2531" y="-89" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_0v1giz9_di" bpmnElement="SequenceFlow_0v1giz9">
        <di:waypoint x="2490" y="-71" />
        <di:waypoint x="2531" y="-71" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="task-14_di" bpmnElement="task-14">
        <dc:Bounds x="2390" y="361" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_1uklpva_di" bpmnElement="SequenceFlow_1uklpva">
        <di:waypoint x="2280" y="401" />
        <di:waypoint x="2390" y="401" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="TextAnnotation_0shgjo0_di" bpmnElement="TextAnnotation_0shgjo0">
        <dc:Bounds x="2390" y="239" width="100" height="89" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Association_1tbyvrx_di" bpmnElement="Association_1tbyvrx">
        <di:waypoint x="2440" y="361" />
        <di:waypoint x="2440" y="328" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_0dn8ydo_di" bpmnElement="SequenceFlow_0dn8ydo">
        <di:waypoint x="908" y="-44" />
        <di:waypoint x="1145" y="-44" />
        <di:waypoint x="1145" y="80" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_0injoza_di" bpmnElement="SequenceFlow_0injoza">
        <di:waypoint x="2490" y="401" />
        <di:waypoint x="2555" y="401" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="IntermediateThrowEvent_1anwezr_di" bpmnElement="event-7">
        <dc:Bounds x="2555" y="383" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="2537" y="426" width="73" height="40" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_0caoj3i_di" bpmnElement="SequenceFlow_0caoj3i">
        <di:waypoint x="2591" y="401" />
        <di:waypoint x="2614" y="401" />
        <di:waypoint x="2614" y="93" />
        <di:waypoint x="2636" y="93" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>', '{"entryTaskTemplateIds": [4]}', '2019-02-01 00:00:00.000', '2019-02-01 00:00:00.000');
