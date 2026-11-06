BEGIN;
-- Task type.
INSERT INTO public.task_types
(id, "name", created_at, updated_at)
VALUES
(3, 'Видача ліцензії', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000');

-- Task template.
INSERT INTO public.task_templates
(id, "name", task_type_id, document_template_id, json_schema, html_template, created_at, updated_at)
VALUES
(16, 'Заявка на видачу ліцензії на провадження господарської діяльності з поводження: з небезпечними відходами', 3, 16, '{}', '', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(17, 'Реєстрація заявки', 3, 17, '{}', '', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(18, 'Перевірка заявки', 3, 18, '{}', '', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(19, 'Рішення про ліцензію', 3, 19, '{}', '', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(20, 'Підписати  ліцензію / лист про відмову', 3, 20, '{}', '', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(21, 'Перегляд негативної відповіді', 3, 21, '{}', '', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000');

-- Document type.
INSERT INTO public.document_types
(id, "name", document_category_id, created_at, updated_at) 
VALUES
(16, 'Заявка на видачу ліцензії на провадження господарської діяльності з поводження: з небезпечними відходами', 2, '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(17, 'Реєстрація заявки', 3, '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(18, 'Перевірка заявки', 4, '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(19, 'Рішення про ліцензію', 4, '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(20, 'Підписати  ліцензію / лист про відмову', 3, '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(21, 'Перегляд негативної відповіді', 2, '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000');

-- Document template.
INSERT INTO public.document_templates
(id, "name", document_type_id, json_schema, html_template, created_at, updated_at)
VALUES
(16, 'Заявка на видачу ліцензії на провадження господарської діяльності з поводження: з небезпечними відходами', 16, '{
  "title": "Заявка на видачу ліцензії на провадження господарської діяльності з поводження: з небезпечними відходами",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''form'', ''attachments'']; }",
  "properties": {
    "form": {
      "type": "object",
      "description": "Текст заяви",
      "properties": {
        "licensingAuthority": {
          "type": "string",
          "maxLength": 100,
          "value": "Міністерство екології та природних ресурсів України",
          "description": "Найменування органу ліцензування"
        },
        "name": {
          "type": "string",
          "maxLength": 100,
          "description": "Найменування юридичної особи/прізвище, ім’я, по батькові фізичної особи - підприємця"
        },
        "location": {
          "type": "string",
          "maxLength": 100,
          "description": "Місцезнаходження юридичної особи/місце реєстрації фізичної особи - підприємця"
        },
        "code": {
          "type": "integer",
          "maxLength": 10,
          "description": "Для юридичних осіб - код згідно з ЄДРПОУ, для фізичних осіб-підприємців - ідентифікаційний код або серія, номер паспорта фізичної особи-підприємця, ким і коли виданий"
        },
        "chiefName": {
          "type": "string",
          "maxLength": 100,
          "description": "Прізвище, ім’я, по батькові керівника юридичної особи"
        },
        "phone": {
          "type": "string",
          "maxLength": 14,
          "pattern": "^380[0-9]{9}$",
          "sample": "Номер у форматі 380XXXXXXXXX",
          "description": "Номер телефону",
          "mask": "380999999999"
        },
        "fax": {
          "type": "string",
          "maxLength": 14,
          "pattern": "^\\+[0-9]{1,3}-[0-9]{3}-[0-9]{7}$",
          "description": "Номер факсу"
        },
        "email": {
          "type": "string",
          "maxLength": 30,
          "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]+$",
          "sample": "Електронна адреса має бути в форматі \"test@example.com\"",
          "description": "Адреса електронної пошти"
        },
        "legalForm": {
          "type": "string",
          "maxLength": 30,
          "description": "Організаційно-правова форма (для юридичної особи)"
        },
        "copfg": {
          "type": "integer",
          "maxLength": 3,
          "description": "КОПФГ"
        },
        "coatuu": {
          "type": "integer",
          "maxLength": 10,
          "description": "КОАТУУ"
        },
        "license": {
          "type": "string",
          "maxLength": 100,
          "description": "Серія, номер, дата видачі та строк дії останньої виданої ліцензії (за наявності), орган ліцензування)"
        },
        "economicActivity": {
          "type": "string",
          "maxLength": 100,
          "description": "Види господарської діяльності повністю або частково"
        }
      },
      "required": [
        "licensingAuthority",
        "name",
        "location",
        "code",
        "chiefName",
        "phone",
        "fax",
        "email",
        "legalForm",
        "copfg",
        "coatuu",
        "license",
        "economicActivity"
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
      "sample": "Документи що подаються на видачу ліцензії на провадження господарської діяльності з поводження: з небезпечними відходами",
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
            "type": "integer",
            "control": "input.file"
          },
          "mimeType": {
            "type": "string",
            "dictionary": "attachMimeTypes",
            "hidden": true
          },
          "size": {
            "type": "integer"
          }
        },
        "required": ["name", "id", "mimeType"]
      }
    }
  },
  "required": ["form", "attachments"]
}', '<html></html>', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(17, 'Реєстрація заявки', 17, '{
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
      "required": ["name"]
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
      "required": ["number"]
    }
  },
  "required": ["register", "registration"]
}', '<html></html>', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(18, 'Перевірка заявки', 18, '{
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
      "required": ["name"]
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
      "required": ["approved"]
    }
  },
  "required": ["moderator", "moderation"]
}', '<html></html>', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(19, 'Рішення про ліцензію', 19, '{
  "title": "Рішення про ліцензію",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''decision'']; }",
  "properties": {
    "decision": {
      "type": "object",
      "description": "Причини видачі або відмови",
      "properties": {
        "text": {
          "type": "string",
          "control": "textArea",
          "sample": "Опишіть причини видачі або відмови",
          "minLength": 10,
          "maxLength": 50000
        }
      },
      "required": ["text"]
    }
  },
  "required": ["decision"]
}', '<html></html>', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(20, 'Підписати  ліцензію / лист про відмову', 20, '{
  "title": "Підписати  ліцензію / лист про відмову",
  "type": "object",
  "useEncryption": true,
  "stepOrders": "(allStepsData) => { return [''attachments'']; }",
  "properties": {
    "attachments": {
      "type": "array",
      "description": "ліцензя / лист про відмову",
      "addItem": {
        "text": "Завантажити ліцензію / лист про відмову"
      },
      "control": "select.files",
      "accept": "image/*,application/pdf",
      "maxSize": 10485760,
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
            "type": "integer",
            "control": "input.file"
          },
          "mimeType": {
            "type": "string",
            "dictionary": "attachMimeTypes",
            "hidden": true
          },
          "size": {
            "type": "integer"
          }
        },
        "required": ["name", "id", "mimeType"]
      }
    }
  },
  "required": ["attachments"]
}', '<html></html>', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000'),
(21, 'Перегляд негативної відповіді', 21, '{
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
          "sample": "Опишіть причини відмови",
          "hint": "Відмовлено у зв''язку з недостачею необхідних документів.",
          "minLength": 10,
          "maxLength": 50000
        }
      },
      "required": ["text"]
    }
  },
  "required": ["cancellation"]
}', '<html></html>', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000');

-- Gateway template.
INSERT INTO public.gateway_templates
(id, gateway_type_id, "name", json_schema, created_at, updated_at)
VALUES(5, 1, 'Перевірка', '{
  "formulas": [
    {
      "condition": "(documents) => { return documents.find(item => item.documentTemplateId === 19).data.moderation.approved; }",
      "isDefault": true
    },
    {
      "condition": "(documents) => { return !documents.find(item => item.documentTemplateId === 21).data.moderation.approved; }",
      "isDefault": false
    }
  ]
}', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000');

-- Workflow template.
INSERT INTO public.workflow_templates
(id, "name", xml_bpmn_schema, data, created_at, updated_at)
VALUES(3, 'Видача дозволу на викиди забруднюючих речовин', '<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="bpmn-js (https://demo.bpmn.io)" exporterVersion="3.2.1">
  <bpmn:collaboration id="Collaboration_1gy5wbz">
    <bpmn:participant id="Participant_1etspjk" name="(16) Видача ліцензії на провадження господарської діяльності з поводження: з небезпечними відходами" processRef="Process_1" />
    <bpmn:textAnnotation id="TextAnnotation_1g298i3">
      <bpmn:text>Форма Заяви наведена у Додатку 1 до Постанови КМУ від 13/07/2016 № 446 "Про затвердження ліцензійних умов провадження господарської діяльності поводження з небезепечними відходами</bpmn:text>
    </bpmn:textAnnotation>
  </bpmn:collaboration>
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_0lwdfei">
      <bpmn:lane id="Lane_1vaul64">
        <bpmn:flowNodeRef>task-16</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-17</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>end-event-1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-21</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-18</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>gateway-5</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-20</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>end-event-2</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>task-19</bpmn:flowNodeRef>
        <bpmn:childLaneSet id="LaneSet_0ly8uvo">
          <bpmn:lane id="Lane_0pan2wd" name="Відповідальна особа">
            <bpmn:flowNodeRef>end-event-1</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>task-21</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>task-18</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>gateway-5</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>task-20</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>end-event-2</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>task-19</bpmn:flowNodeRef>
          </bpmn:lane>
          <bpmn:lane id="Lane_0gs3xtb" name="Єдине вікно">
            <bpmn:flowNodeRef>task-17</bpmn:flowNodeRef>
          </bpmn:lane>
          <bpmn:lane id="Lane_0m7xu78" name="Заявник">
            <bpmn:flowNodeRef>task-16</bpmn:flowNodeRef>
            <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
          </bpmn:lane>
        </bpmn:childLaneSet>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:task id="task-16" name="Заповнити форму Заяви">
      <bpmn:incoming>SequenceFlow_0okhwkd</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_0dn8ydo</bpmn:outgoing>
    </bpmn:task>
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>SequenceFlow_0okhwkd</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="task-17" name="Зареєструвати надання документів та звернення">
      <bpmn:incoming>SequenceFlow_0dn8ydo</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_1b9ljn2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="end-event-1">
      <bpmn:incoming>SequenceFlow_1hmjzp2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:task id="task-21" name="Отримати інформацію про відмову у розгляді">
      <bpmn:incoming>SequenceFlow_02bqne1</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_1hmjzp2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="task-18" name="Розглянути матеріали">
      <bpmn:incoming>SequenceFlow_1b9ljn2</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_1s4n902</bpmn:outgoing>
    </bpmn:task>
    <bpmn:exclusiveGateway id="gateway-5">
      <bpmn:incoming>SequenceFlow_1s4n902</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_0mtfinw</bpmn:outgoing>
      <bpmn:outgoing>SequenceFlow_02bqne1</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:task id="task-20" name="Підписати  ліцензію / лист про відмову">
      <bpmn:incoming>SequenceFlow_16r7qe8</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_0injoza</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="end-event-2">
      <bpmn:incoming>SequenceFlow_0injoza</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:task id="task-19" name="Підготувати рішення про ліцензію (видача або відмова)">
      <bpmn:incoming>SequenceFlow_0mtfinw</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_16r7qe8</bpmn:outgoing>
    </bpmn:task>
    <bpmn:sequenceFlow id="SequenceFlow_1hmjzp2" sourceRef="task-21" targetRef="end-event-1" />
    <bpmn:sequenceFlow id="SequenceFlow_0injoza" sourceRef="task-20" targetRef="end-event-2" />
    <bpmn:sequenceFlow id="SequenceFlow_16r7qe8" sourceRef="task-19" targetRef="task-20" />
    <bpmn:sequenceFlow id="SequenceFlow_02bqne1" name="Відмова у розгляді" sourceRef="gateway-5" targetRef="task-21" />
    <bpmn:sequenceFlow id="SequenceFlow_0mtfinw" name="Немає підстав для відмови у розгляді" sourceRef="gateway-5" targetRef="task-19" />
    <bpmn:sequenceFlow id="SequenceFlow_1s4n902" sourceRef="task-18" targetRef="gateway-5" />
    <bpmn:sequenceFlow id="SequenceFlow_1b9ljn2" sourceRef="task-17" targetRef="task-18" />
    <bpmn:sequenceFlow id="SequenceFlow_0dn8ydo" sourceRef="task-16" targetRef="task-17" />
    <bpmn:sequenceFlow id="SequenceFlow_0okhwkd" sourceRef="StartEvent_1" targetRef="task-16" />
    <bpmn:association id="Association_0mols95" sourceRef="task-16" targetRef="TextAnnotation_1g298i3" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1gy5wbz">
      <bpmndi:BPMNShape id="Participant_1etspjk_di" bpmnElement="Participant_1etspjk" isHorizontal="true">
        <dc:Bounds x="156" y="243" width="1375" height="826" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="266" y="310" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task-16_di" bpmnElement="task-16">
        <dc:Bounds x="330" y="288" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="TextAnnotation_1g298i3_di" bpmnElement="TextAnnotation_1g298i3">
        <dc:Bounds x="243" y="81" width="173" height="124" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Association_0mols95_di" bpmnElement="Association_0mols95">
        <di:waypoint x="371" y="288" />
        <di:waypoint x="347" y="205" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="Lane_1vaul64_di" bpmnElement="Lane_1vaul64" isHorizontal="true">
        <dc:Bounds x="186" y="243" width="1345" height="826" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_0m7xu78_di" bpmnElement="Lane_0m7xu78" isHorizontal="true">
        <dc:Bounds x="216" y="243" width="1315" height="183" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_0gs3xtb_di" bpmnElement="Lane_0gs3xtb" isHorizontal="true">
        <dc:Bounds x="216" y="426" width="1315" height="193" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task-21_di" bpmnElement="task-21">
        <dc:Bounds x="863" y="641" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end-event-2_di" bpmnElement="end-event-2">
        <dc:Bounds x="1182" y="786" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task-18_di" bpmnElement="task-18">
        <dc:Bounds x="486" y="764" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_0okhwkd_di" bpmnElement="SequenceFlow_0okhwkd">
        <di:waypoint x="302" y="328" />
        <di:waypoint x="330" y="328" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="task-17_di" bpmnElement="task-17">
        <dc:Bounds x="486" y="470" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_0pan2wd_di" bpmnElement="Lane_0pan2wd" isHorizontal="true">
        <dc:Bounds x="216" y="619" width="1315" height="450" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task-20_di" bpmnElement="task-20">
        <dc:Bounds x="1011" y="764" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_0dn8ydo_di" bpmnElement="SequenceFlow_0dn8ydo">
        <di:waypoint x="430" y="328" />
        <di:waypoint x="536" y="328" />
        <di:waypoint x="536" y="470" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_0injoza_di" bpmnElement="SequenceFlow_0injoza">
        <di:waypoint x="1111" y="804" />
        <di:waypoint x="1182" y="804" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="gateway-5_di" bpmnElement="gateway-5" isMarkerVisible="true">
        <dc:Bounds x="710" y="779" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_1s4n902_di" bpmnElement="SequenceFlow_1s4n902">
        <di:waypoint x="586" y="804" />
        <di:waypoint x="710" y="804" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="task-19_di" bpmnElement="task-19">
        <dc:Bounds x="863" y="764" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_0mtfinw_di" bpmnElement="SequenceFlow_0mtfinw">
        <di:waypoint x="760" y="804" />
        <di:waypoint x="863" y="804" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="761" y="814" width="74" height="40" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_02bqne1_di" bpmnElement="SequenceFlow_02bqne1">
        <di:waypoint x="735" y="779" />
        <di:waypoint x="735" y="681" />
        <di:waypoint x="863" y="681" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="678" y="720" width="51" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_16r7qe8_di" bpmnElement="SequenceFlow_16r7qe8">
        <di:waypoint x="963" y="804" />
        <di:waypoint x="1011" y="804" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_1b9ljn2_di" bpmnElement="SequenceFlow_1b9ljn2">
        <di:waypoint x="536" y="550" />
        <di:waypoint x="536" y="764" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="end-event-1_di" bpmnElement="end-event-1">
        <dc:Bounds x="1043" y="663" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_1hmjzp2_di" bpmnElement="SequenceFlow_1hmjzp2">
        <di:waypoint x="963" y="681" />
        <di:waypoint x="1043" y="681" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>', '{"entryTaskTemplateIds": [16]}', '2019-02-27 00:00:00.000', '2019-02-27 00:00:00.000');

COMMIT;