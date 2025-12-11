--
-- This file is a kit for e2e tests
--

INSERT INTO workflow_template_categories
(id, parent_id, "name", created_at, updated_at)
VALUES(29, NULL, 'testProcess', '2022-12-02 11:32:34.679', '2022-12-02 11:32:34.679');

INSERT INTO workflow_templates
(id, workflow_template_category_id, "name", description, xml_bpmn_schema, "data", created_at, updated_at, is_active, access_units, errors_subscribers)
VALUES(988191, 29, 'Initial bpmn-process', '', '<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd">
  <bpmn2:collaboration id="Collaboration_0eq9opz">
    <bpmn2:participant id="Participant_1jnwnpc" name="користувач" processRef="Process_1" />
  </bpmn2:collaboration>
  <bpmn2:process id="Process_1" isExecutable="false">
    <bpmn2:startEvent id="StartEvent_1">
      <bpmn2:outgoing>Flow_0yljdiv</bpmn2:outgoing>
    </bpmn2:startEvent>
    <bpmn2:task id="task-988191001" name="Заява">
      <bpmn2:incoming>Flow_0yljdiv</bpmn2:incoming>
      <bpmn2:outgoing>Flow_1twkt51</bpmn2:outgoing>
    </bpmn2:task>
    <bpmn2:sequenceFlow id="Flow_0yljdiv" sourceRef="StartEvent_1" targetRef="task-988191001" />
    <bpmn2:endEvent id="end-event-1" name="end-event-1">
      <bpmn2:incoming>Flow_1l87kgr</bpmn2:incoming>
    </bpmn2:endEvent>
    <bpmn2:intermediateThrowEvent id="event-988191003" name="пустий івент об&#39;єднання">
      <bpmn2:incoming>Flow_1lftw96</bpmn2:incoming>
      <bpmn2:incoming>Flow_15yf3yt</bpmn2:incoming>
      <bpmn2:outgoing>Flow_0kf593c</bpmn2:outgoing>
    </bpmn2:intermediateThrowEvent>
    <bpmn2:intermediateCatchEvent id="event-988191002" name="Створення юніту">
      <bpmn2:incoming>Flow_1iyqzew</bpmn2:incoming>
      <bpmn2:outgoing>Flow_1csanhq</bpmn2:outgoing>
      <bpmn2:signalEventDefinition id="SignalEventDefinition_192f5b0" />
    </bpmn2:intermediateCatchEvent>
    <bpmn2:intermediateCatchEvent id="event-988191004" name="Запис в рандомний реєстр (keyId-1)">
      <bpmn2:incoming>Flow_1csanhq</bpmn2:incoming>
      <bpmn2:outgoing>Flow_1lftw96</bpmn2:outgoing>
      <bpmn2:conditionalEventDefinition id="ConditionalEventDefinition_1wutnh3">
        <bpmn2:condition xsi:type="bpmn2:tFormalExpression" />
      </bpmn2:conditionalEventDefinition>
    </bpmn2:intermediateCatchEvent>
    <bpmn2:sequenceFlow id="Flow_1l87kgr" sourceRef="event-988191001" targetRef="end-event-1" />
    <bpmn2:sequenceFlow id="Flow_1lftw96" sourceRef="event-988191004" targetRef="event-988191003" />
    <bpmn2:sequenceFlow id="Flow_0kf593c" sourceRef="event-988191003" targetRef="event-988191001" />
    <bpmn2:sequenceFlow id="Flow_1csanhq" sourceRef="event-988191002" targetRef="event-988191004" />
    <bpmn2:sequenceFlow id="Flow_1twkt51" sourceRef="task-988191001" targetRef="gateway-988191001" />
    <bpmn2:sequenceFlow id="Flow_15yf3yt" name="Ні" sourceRef="gateway-988191001" targetRef="event-988191003" />
    <bpmn2:sequenceFlow id="Flow_1iyqzew" name="Так" sourceRef="gateway-988191001" targetRef="event-988191002" />
    <bpmn2:exclusiveGateway id="gateway-988191001" name="Чи створювати юніт?">
      <bpmn2:incoming>Flow_1twkt51</bpmn2:incoming>
      <bpmn2:outgoing>Flow_15yf3yt</bpmn2:outgoing>
      <bpmn2:outgoing>Flow_1iyqzew</bpmn2:outgoing>
    </bpmn2:exclusiveGateway>
    <bpmn2:intermediateThrowEvent id="event-988191001" name="Інформування користувачу про">
      <bpmn2:incoming>Flow_0kf593c</bpmn2:incoming>
      <bpmn2:outgoing>Flow_1l87kgr</bpmn2:outgoing>
      <bpmn2:messageEventDefinition id="MessageEventDefinition_0jgx4gz" />
    </bpmn2:intermediateThrowEvent>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_0eq9opz">
      <bpmndi:BPMNShape id="Participant_1jnwnpc_di" bpmnElement="Participant_1jnwnpc" isHorizontal="true">
        <dc:Bounds x="310" y="100" width="1080" height="300" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="362" y="252" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_0mokyg2_di" bpmnElement="task-988191001">
        <dc:Bounds x="450" y="230" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_04it6nx_di" bpmnElement="event-988191001">
        <dc:Bounds x="1072" y="252" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="1047" y="295" width="86" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_15ucmj5_di" bpmnElement="end-event-1">
        <dc:Bounds x="1172" y="252" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="1160" y="295" width="61" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_1odnki7_di" bpmnElement="event-988191003">
        <dc:Bounds x="952" y="252" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="938" y="295" width="65" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_0yljdiv_di" bpmnElement="Flow_0yljdiv">
        <di:waypoint x="398" y="270" />
        <di:waypoint x="450" y="270" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_0kf593c_di" bpmnElement="Flow_0kf593c">
        <di:waypoint x="988" y="270" />
        <di:waypoint x="1072" y="270" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="Event_1g8q855_di" bpmnElement="event-988191004">
        <dc:Bounds x="872" y="152" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="848" y="195" width="84" height="40" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_0wv15nd_di" bpmnElement="event-988191002">
        <dc:Bounds x="752" y="152" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="726" y="208" width="88" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1csanhq_di" bpmnElement="Flow_1csanhq">
        <di:waypoint x="788" y="170" />
        <di:waypoint x="872" y="170" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1lftw96_di" bpmnElement="Flow_1lftw96">
        <di:waypoint x="908" y="170" />
        <di:waypoint x="970" y="170" />
        <di:waypoint x="970" y="252" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1l87kgr_di" bpmnElement="Flow_1l87kgr">
        <di:waypoint x="1108" y="270" />
        <di:waypoint x="1172" y="270" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="Gateway_0uiblhn_di" bpmnElement="gateway-988191001" isMarkerVisible="true">
        <dc:Bounds x="635" y="245" width="50" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="621" y="302" width="79" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1twkt51_di" bpmnElement="Flow_1twkt51">
        <di:waypoint x="550" y="270" />
        <di:waypoint x="635" y="270" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_15yf3yt_di" bpmnElement="Flow_15yf3yt">
        <di:waypoint x="685" y="270" />
        <di:waypoint x="952" y="270" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="737" y="252" width="11" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1iyqzew_di" bpmnElement="Flow_1iyqzew">
        <di:waypoint x="660" y="245" />
        <di:waypoint x="660" y="170" />
        <di:waypoint x="752" y="170" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="685" y="205" width="18" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>
', '{"statuses":[{"eventTemplateId":988191004,"taskOrEventTemplateId":"{\"id\":988191004,\"type\":\"event\",\"name\":\"Запис в рандомний реєстр (keyId-1)\",\"sourceId\":988191004}","calculate":"(documents, events) => ([\n  {\n    type: \"doing\",\n    label: \"ЮНІТ СТВОРЕНО\",\n    description: \"\",\n    isStatusesTab: false\n  }\n]);\n"},{"eventTemplateId":988191001,"taskOrEventTemplateId":"{\"id\":988191001,\"type\":\"event\",\"name\":\"Інформування користувачу про\",\"sourceId\":988191001}","calculate":"(documents, events) => ([\n  {\n    type: \"done\",\n    label: \"ВИКОНАНО\",\n    description: \"\",\n    isStatusesTab: false\n  }\n]);\n"}],"entryTaskTemplateIds":[{"name":"Start","id":"() => 988191001;","hidden":false}],"numberTemplateId":818,"timeline":{}}'::json, '2025-05-20 10:43:50.942', '2025-05-20 12:47:43.511', true, '{}', '{}');


INSERT INTO document_templates
(id, "name", json_schema, html_template, created_at, updated_at, access_json_schema, additional_data_to_sign)
VALUES(988191001, 'Заява', '{
    "type": "object",
    "title": "Initial bpmn-process",
    "pdfRequired": true,
    "signRequired": true,
    "finalScreen": {
        "title": " ",
        "subtitle": "Initial bpmn-process DONE"
    },
    "calcTriggers": [],
    "properties": {
        "calculated": {
            "type": "object",
            "description": "Розрахункові дані",
            "checkStepHidden": "() => true",
            "properties": {
                "docNumber": {
                    "type": "string",
                    "description": "Номер процесу",
                    "value": "workflow.number",
                    "checkRequired": "() => { return  true }",
                    "readOnly": true,
                    "hidden": true
                },
                "userId": {
                    "type": "string",
                    "description": "Id Заявника",
                    "checkRequired": "() => true",
                    "value": "user.id",
                    "readOnly": true,
                    "hidden": true
                },
                "userName": {
                    "type": "string",
                    "description": "ПІБ Заявника",
                    "checkRequired": "() => true",
                    "value": "user.name",
                    "readOnly": true,
                    "hidden": true
                },
                "userNameModified": {
                    "type": "string",
                    "description": "ПІБ Заявника (модифіковане)",
                    "value": "({documents,events,documentData,user}) => {return (documentData?.calculated?.userName?.trim()?.split('' '')?.map((el => el?.charAt(0) + el?.slice(1)?.toLowerCase()))?.join('' ''));}",
                    "checkRequired": "() => true",
                    "hidden": true,
                    "readOnly": true
                },
                "userFirstName": {
                    "type": "string",
                    "description": "Ім''я Заявника",
                    "checkRequired": "() => true",
                    "value": "user.firstName",
                    "readOnly": true,
                    "hidden": true
                },
                "userLastName": {
                    "type": "string",
                    "description": "Прізвище Заявника",
                    "checkRequired": "() => true",
                    "value": "user.lastName",
                    "readOnly": true,
                    "hidden": true
                },
                "userMiddleName": {
                    "type": "string",
                    "description": "По батькові Заявника",
                    "value": "user.middleName",
                    "readOnly": true,
                    "hidden": true
                },
                "userIpn": {
                    "type": "string",
                    "description": "РНОКПП",
                    "value": "user.ipn",
                    "checkRequired": "() => true",
                    "hidden": true,
                    "readOnly": true
                },
                "edrpou": {
                    "type": "string",
                    "description": "ЄДРПОУ",
                    "value": "user.edrpou",
                    "hidden": true,
                    "readOnly": true
                }
            }
        },
        "companyInfo": {
            "type": "object",
            "description": "Інформація про організацію",
            "checkValid": [
                {
                    "isValid": "(propertyData, stepData, documentData) => !(stepData?.findEdrpou?.length > 0)",
                    "errorText": "Організація з таким єдрпоу вже існує"
                }
            ],
            "properties": {
                "createUnit": {
                    "type": "string",
                    "control": "radio.group",
                    "description": "Створити юніт?",
                    "checkRequired": "(propertyData, pageObject, documentDataObject) => { return true; }",
                    "checkHidden": "(propertyData, pageObject, documentDataObject) => { return false; }",
                    "cleanWhenHidden": true,
                    "fontSize": 14,
                    "defaultValue": "(document) => { return ''Ні''; }",
                    "displayAllSamples": true,
                    "items": [
                        {
                            "id": "Так",
                            "title": "Так"
                        },
                        {
                            "id": "Ні",
                            "title": "Ні",
                            "sample": "<div style=''opacity: 0.5''>Просто sample</div>"
                        }
                    ],
                    "rowDirection": true
                },
                "companyName": {
                    "type": "string",
                    "description": "Назва організації",
                    "useTrim": true,
                    "checkRequired": "(propertyData, pageObject, documentData, parentData) => !(pageObject?.createUnit && pageObject?.createUnit === ''Ні'')",
                    "checkHidden": "(propertyData, pageObject, documentData, parentData) => !!(pageObject?.createUnit && pageObject?.createUnit === ''Ні'');",
                },
                "edrpou": {
                    "type": "string",
                    "description": "ЄДРПОУ організації",
                    "mask": "99999999",
                    "pattern": "^\\d{8}$",
                    "cleanWhenHidden": true,
                    "checkRequired": "(propertyData, pageObject, documentData, parentData) => false",
                    "checkHidden": "(propertyData, pageObject, documentData, parentData) => !!(pageObject?.createUnit && pageObject?.createUnit === ''Ні'');",
                    "noMargin": true,
                    "checkValid": [
                        {
                            "isValid": "(propertyData, stepData, founder) => !!(propertyData?.length === 8)",
                            "errorText": "Вкажіть коректний ЄДРПОУ"
                        }
                    ]
                },
                "noEdrpou": {
                    "control": "checkbox.group",
                    "cleanWhenHidden": true,
                    "fontSize": 16,
                    "checkHidden": "(propertyData, pageObject, documentData, parentData) => !(pageObject?.createUnit === ''Так'')",
                    "items": [
                        {
                            "id": "0",
                            "title": "Немає ЄДРПОУ"
                        }
                    ],
                    "rowDirection": true
                },
                "findEdrpou": {
                    "type": "array",
                    "description": "ЄДРПОУ організації, яка вже існує",
                    "control": "register",
                    "multiple": true,
                    "keyId": 1,
                    "hidden": true,
                    "setDefined": true,
                    "searchEqual": "(data) => { return data?.companyInfo?.edrpou || ''unknown''; }",
                    "filters": [],
                    "listenedValuesForRequest": [
                        "companyInfo.edrpou"
                    ]
                }
            }
        },
        "additionalInfo": {
            "type": "object",
            "description": "Рандомні контроли, всі необов''язкові",
            "properties": {
                "userPhone": {
                    "control": "phone",
                    "description": "Номер телефона",
                    "defaultCountry": "ua",
                    "checkRequired": "() => false;",
                    "onlyCountries": [
                        "af",
                        "al",
                        "dz",
                        "as",
                        "ad",
                        "ao",
                        "ai",
                        "ag",
                        "ar",
                        "am",
                        "aw",
                        "au",
                        "at",
                        "az",
                        "bs",
                        "bh",
                        "bd",
                        "by",
                        "bb",
                        "be",
                        "bz",
                        "bj",
                        "bm",
                        "bt",
                        "bo",
                        "ba",
                        "bw",
                        "br",
                        "io",
                        "vg",
                        "bn",
                        "bg",
                        "bf",
                        "bi",
                        "kh",
                        "cm",
                        "ca",
                        "cv",
                        "bq",
                        "ky",
                        "cf",
                        "td",
                        "cl",
                        "cn",
                        "co",
                        "km",
                        "cd",
                        "cg",
                        "ck",
                        "cr",
                        "ci",
                        "hr",
                        "cu",
                        "cw",
                        "cy",
                        "cz",
                        "dk",
                        "dj",
                        "dm",
                        "do",
                        "ec",
                        "eg",
                        "sv",
                        "gq",
                        "er",
                        "ee",
                        "et",
                        "fk",
                        "fo",
                        "fj",
                        "fi",
                        "fr",
                        "gf",
                        "pf",
                        "ga",
                        "gm",
                        "ge",
                        "de",
                        "gh",
                        "gi",
                        "gr",
                        "gl",
                        "gd",
                        "gp",
                        "gu",
                        "gt",
                        "gn",
                        "gw",
                        "gy",
                        "ht",
                        "hn",
                        "hk",
                        "hu",
                        "is",
                        "in",
                        "id",
                        "ir",
                        "iq",
                        "ie",
                        "il",
                        "it",
                        "jm",
                        "jp",
                        "jo",
                        "kz",
                        "ke",
                        "ki",
                        "xk",
                        "kw",
                        "kg",
                        "la",
                        "lv",
                        "lb",
                        "ls",
                        "lr",
                        "ly",
                        "li",
                        "lt",
                        "lu",
                        "mo",
                        "mk",
                        "mg",
                        "mw",
                        "my",
                        "mv",
                        "ml",
                        "mt",
                        "mh",
                        "mq",
                        "mr",
                        "mu",
                        "mx",
                        "fm",
                        "md",
                        "mc",
                        "mn",
                        "me",
                        "ms",
                        "ma",
                        "mz",
                        "mm",
                        "na",
                        "nr",
                        "np",
                        "nl",
                        "nc",
                        "nz",
                        "ni",
                        "ne",
                        "ng",
                        "nu",
                        "nf",
                        "kp",
                        "mp",
                        "no",
                        "om",
                        "pl",
                        "pk",
                        "pw",
                        "ps",
                        "pa",
                        "pg",
                        "py",
                        "pe",
                        "ph",
                        "pn",
                        "pt",
                        "pr",
                        "qa",
                        "re",
                        "ro",
                        "rw",
                        "bl",
                        "sh",
                        "kn",
                        "lc",
                        "mf",
                        "pm",
                        "vc",
                        "ws",
                        "sm",
                        "st",
                        "sa",
                        "sn",
                        "rs",
                        "sc",
                        "sl",
                        "sg",
                        "sx",
                        "sk",
                        "si",
                        "sb",
                        "so",
                        "za",
                        "kr",
                        "ss",
                        "es",
                        "lk",
                        "sd",
                        "sr",
                        "sz",
                        "se",
                        "ch",
                        "sy",
                        "tw",
                        "tj",
                        "tz",
                        "th",
                        "tl",
                        "tg",
                        "tk",
                        "to",
                        "tt",
                        "tn",
                        "tr",
                        "tm",
                        "tc",
                        "tv",
                        "vi",
                        "ug",
                        "ua",
                        "ae",
                        "gb",
                        "us",
                        "uy",
                        "uz",
                        "vu",
                        "va",
                        "ve",
                        "vn",
                        "wf",
                        "ye",
                        "zm",
                        "zw"
                    ],
                    "disableAreaCodes": true
                },
                "toggleMoggle": {
                    "type": "boolean",
                    "description": "Перемикач",
                    "control": "toggle",
                    "notRequiredLabel": "за наявності",
                    "checkRequired": "(propertyData, pageObject, documentDataObject) => { return false; }",
                    "checkHidden": "(propertyData, pageObject, documentDataObject) => { return false; }",
                    "offText": "Виключено",
                    "onText": "Включено",
                    "defaultValue": false
                },
                "myRadio": {
                    "type": "string",
                    "control": "radio.group",
                    "description": "Радіокнопки",
                    "notRequiredLabel": "за наявності",
                    "checkRequired": "(propertyData, pageObject, documentDataObject) => { return false; }",
                    "checkHidden": "(propertyData, pageObject, documentDataObject) => { return false; }",
                    "cleanWhenHidden": true,
                    "fontSize": 14,
                    "defaultValue": "(document) => { return ''Біл Гейц''; }",
                    "displayAllSamples": true,
                    "items": [
                        {
                            "id": "Біл Гейц",
                            "title": "Біл Гейц",
                            "sample": "<div style=''opacity: 0.5''>Тестовий текст 1</div>",
                            "isDisabled": "(propertyData, pageObject, documentDataObject) => { return true; }"
                        },
                        {
                            "id": "Тім Епл",
                            "title": "Тім Епл",
                            "sample": "<div style=''opacity: 0.5''>Тестовий текст 2</div>"
                        }
                    ],
                    "rowDirection": true
                },
                "myCheckbox": {
                    "type": "array",
                    "control": "checkbox.group",
                    "description": "Прапорці",
                    "notRequiredLabel": "за наявності",
                    "checkRequired": "(propertyData, pageObject, documentDataObject) => { return false; }",
                    "checkHidden": "(propertyData, pageObject, documentDataObject) => { return false; }",
                    "cleanWhenHidden": true,
                    "fontSize": 14,
                    "displayAllSamples": true,
                    "defaultValue": [
                        "Біл Гейц"
                    ],
                    "items": [
                        {
                            "id": "Біл Гейц",
                            "title": "Біл Гейц",
                            "sample": "<div style=''opacity: 0.5''>Тестовий текст 1</div>",
                            "isDisabled": "(propertyData, pageObject, documentDataObject) => { return true; }"
                        },
                        {
                            "id": "Тім Епл",
                            "title": "Тім Епл",
                            "sample": "<div style=''opacity: 0.5''>Тестовий текст 2</div>"
                        },
                        {
                            "id": "Блискавка Маквін",
                            "title": "Блискавка Маквін",
                            "sample": "<div style=''opacity: 0.5''>Тестовий текст 3</div>"
                        }
                    ],
                    "rowDirection": false
                }
            }
        }
    }
}', '<!DOCTYPE html>
<html lang="uk">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
    <style>
      body {
        font-size: 12px;
        margin: 0;
        font-family: ''e-Ukraine'', Arial, Helvetica, sans-serif;
        line-height: 1;
        padding-right: 80px;
        padding-left: 80px;
        padding-top: 56px;
        padding-bottom: 56px;
        letter-spacing: -0.02em;
      }
    </style>
  </head>
  <body>
    <p>You did it!!!!!</p>
  </body>
</html>', '2025-05-20 10:44:13.073', '2025-05-20 10:44:13.073', '{"inboxes":{"workflowCreator":false},"workflowFiles":{"workflowCreator":false}}'::json, NULL);

INSERT INTO task_templates
(id, "name", document_template_id, json_schema, html_template, created_at, updated_at)
VALUES(988191001, 'Заява', 988191001, '{"setPermissions":[{"performerUsersIsWorkflowOwner":true}]}', '<!DOCTYPE html>
<html lang="uk">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
    <style>
      body {
        font-size: 12px;
        margin: 0;
        font-family: ''e-Ukraine'', Arial, Helvetica, sans-serif;
        line-height: 1;
        padding-right: 80px;
        padding-left: 80px;
        padding-top: 56px;
        padding-bottom: 56px;
        letter-spacing: -0.02em;
      }
    </style>
  </head>
  <body>
  </body>
</html>', '2025-05-20 10:44:13.075', '2025-05-20 10:44:13.075');

INSERT INTO number_templates
(id, "name", "template", created_at, updated_at)
VALUES(818, 'initial number template', '{{date ''YYYY''}}{{date ''MM''}}{{date ''DD''}}{{timestamp 2}}-{{id}}', '2025-05-20 11:47:49.588', '2025-05-20 11:47:49.588');

INSERT INTO gateway_templates
(id, gateway_type_id, "name", description, json_schema, created_at, updated_at)
VALUES(988191001, 1, 'Чи створювати юніт?', '', '{"formulas":[{"isDefault":false,"id":"Ні","condition":"//Hi\n(documents) => { const createUnit = documents.find(doc => doc.documentTemplateId === 988191001).data.companyInfo?.createUnit; return createUnit === ''Ні''; }"},{"isDefault":false,"id":"Так","condition":"//Так\n(documents) => { const createUnit = documents.find(doc => doc.documentTemplateId === 988191001).data.companyInfo?.createUnit; return createUnit === ''Так''; }"}],"isCurrentOnly":true}', '2025-05-20 11:53:03.675', '2025-05-20 11:53:03.675');

INSERT INTO event_templates
(id, event_type_id, "name", description, json_schema, html_template, created_at, updated_at)
VALUES(988191003, 1, 'пустий івент об''єднання', '', '{}', '', '2025-05-20 10:45:29.941', '2025-05-20 10:45:29.941');
INSERT INTO event_templates
(id, event_type_id, "name", description, json_schema, html_template, created_at, updated_at)
VALUES(988191001, 1, 'Інформування користувачу про', '', '{
    "emailsByUserId": "(documents) => { const userId = documents.find(doc => doc.documentTemplateId === 988191001).data.calculated.userId; return userId ? [userId] : []; }",
    "subject": "() => ''Initial email'' ",
    "fullText": "(documents, events) => {const formatName = str => {str = str.toLowerCase().trim();str = str.split(/[-–—]/).join(''-'');const wordsArray = str.split('' '').filter((word => word !== ''''));return wordsArray.map((word => {const parts = word.split(''-'').map((part => part.charAt(0).toUpperCase() + part.slice(1)));return parts.join(''-'')})).join('' '')};const data = documents.find((doc => doc.documentTemplateId === 988191001)).data;const docNumber = data?.calculated?.docNumber;const applicantFirstName = data?.calculated?.userFirstName;const normalizeApplicantFirstName = formatName(applicantFirstName);return `<p>👋 Hi, ${normalizeApplicantFirstName}!</p></div> <div style=''font-size: 18px;line-height: 24px;color: #000;margin: 20px 0;''> <p> Application ${docNumber} was created.</p>`};"
}', '', '2025-05-20 10:44:14.387', '2025-05-20 10:44:14.387');
INSERT INTO event_templates
(id, event_type_id, "name", description, json_schema, html_template, created_at, updated_at)
VALUES(988191004, 3, 'Запис в рандомний реєстр (keyId-1)', '', '{
    "saveToRegisters": {
        "registerId": 1,
        "keyId": 1,
        "map": {
            "companyName": "documents.988191001.data.companyInfo.companyName",
            "edrpou": "documents.988191001.data.companyInfo.edrpou",
            "headCode": "documents.988191001.data.calculated.userIpn",
            "unit":  "(documents, events) => events.find(doc => doc.eventTemplateId === 988191002).data.result.create.unitId"
        }
    }
}', '', '2025-05-20 11:01:13.179', '2025-05-20 11:01:13.179');
INSERT INTO event_templates
(id, event_type_id, "name", description, json_schema, html_template, created_at, updated_at)
VALUES(988191002, 5, 'Створення юніту', '', '{
    "eventUnitType": "create",
    "name": "(documents, events) => {const data = documents.find((item => item.documentTemplateId === 988191001)).data;const companyName = data?.companyInfo.companyName;const edrpou = data?.companyInfo.edrpou;const headCode = data?.calculated.userIpn;return `Test ${companyName} (${edrpou?edrpou:headCode})`};",
    "description": "(documents, events) => { return ''Тестовий юніт''; }",
    "headsIpn": "(documents, events) => {const headCode = documents.find((item => item.documentTemplateId === 988191001))?.data?.calculated?.userIpn;return [headCode]};"
}', '', '2025-05-20 10:44:17.711', '2025-05-20 10:44:17.711');

INSERT INTO workflows
(id, workflow_template_id, "name", is_final, cancellation_type_id, created_by, updated_by, "data", due_date, created_at, updated_at, workflow_status_id, "number", user_data, has_unresolved_errors, created_by_unit_heads, created_by_units, observer_units, is_personal, parent_id, created_by_ipn, statuses)
VALUES('f7a0f7e0-3576-11f0-9cb4-c3090b0731a2'::uuid, 988191, NULL, true, NULL, '682c3749b09b9b183bf98a02', '682c3749b09b9b183bf98a02', '{"messages": [{"data": {"taskId": "f7a40520-3576-11f0-9cb4-c3090b0731a2", "workflowId": "f7a0f7e0-3576-11f0-9cb4-c3090b0731a2", "amqpMessageId": "5789745e-8a61-4b45-9ccb-809959e3cc7d"}, "type": "in", "createdAt": "2025-05-20T12:36:16.107Z", "sequences": [{"id": "Flow_1twkt51", "sourceRef": "task-988191001", "targetRef": "gateway-988191001"}]}, {"data": {"userId": "system", "workflowId": "f7a0f7e0-3576-11f0-9cb4-c3090b0731a2", "sequenceIds": ["Flow_15yf3yt", "Flow_1iyqzew"], "amqpMessageId": "322fc3a0-5ff9-4add-840d-e8da22ebee5e", "gatewayTemplateId": 988191001, "workflowTemplateId": 988191}, "type": "out", "createdAt": "2025-05-20T12:36:16.110Z", "sequences": [{"id": "Flow_1twkt51", "sourceRef": "task-988191001", "targetRef": "gateway-988191001"}]}, {"data": {"gatewayId": "05b1bcc0-3577-11f0-ba3f-4fb18f925d1e", "workflowId": "f7a0f7e0-3576-11f0-9cb4-c3090b0731a2", "amqpMessageId": "3c892259-8673-40c4-8c70-193504599421"}, "type": "in", "createdAt": "2025-05-20T12:36:16.149Z", "sequences": [{"id": "Flow_1iyqzew", "name": "Так", "sourceRef": "gateway-988191001", "targetRef": "event-988191002"}]}, {"data": {"userId": "system", "workflowId": "f7a0f7e0-3576-11f0-9cb4-c3090b0731a2", "amqpMessageId": "f6ecc68c-5b36-4e4b-8179-61ffe8bc6f22", "eventTemplateId": 988191002, "workflowTemplateId": 988191}, "type": "out", "createdAt": "2025-05-20T12:36:16.151Z", "sequences": [{"id": "Flow_1iyqzew", "name": "Так", "sourceRef": "gateway-988191001", "targetRef": "event-988191002"}]}, {"data": {"eventId": "bd2631f0-3578-11f0-974a-df614269aae5", "workflowId": "f7a0f7e0-3576-11f0-9cb4-c3090b0731a2", "amqpMessageId": "75adfae9-b60a-4c6d-99bb-eb5f86230c93"}, "type": "in", "createdAt": "2025-05-20T12:48:33.448Z", "sequences": [{"id": "Flow_1csanhq", "sourceRef": "event-988191002", "targetRef": "event-988191004"}]}, {"data": {"userId": "system", "workflowId": "f7a0f7e0-3576-11f0-9cb4-c3090b0731a2", "amqpMessageId": "28b26b82-0dd2-4825-8dfc-a032a4debc4c", "eventTemplateId": 988191004, "workflowTemplateId": 988191}, "type": "out", "createdAt": "2025-05-20T12:48:33.451Z", "sequences": [{"id": "Flow_1csanhq", "sourceRef": "event-988191002", "targetRef": "event-988191004"}]}, {"data": {"eventId": "bd312e70-3578-11f0-974a-df614269aae5", "workflowId": "f7a0f7e0-3576-11f0-9cb4-c3090b0731a2", "amqpMessageId": "1ec40a91-c74d-418a-b495-7e9bdd2d977a"}, "type": "in", "createdAt": "2025-05-20T12:48:33.508Z", "sequences": [{"id": "Flow_1lftw96", "sourceRef": "event-988191004", "targetRef": "event-988191003"}]}, {"data": {"userId": "system", "workflowId": "f7a0f7e0-3576-11f0-9cb4-c3090b0731a2", "amqpMessageId": "8c2ed781-93a6-436a-bd75-18d7b7c162e3", "eventTemplateId": 988191003, "workflowTemplateId": 988191}, "type": "out", "createdAt": "2025-05-20T12:48:33.511Z", "sequences": [{"id": "Flow_1lftw96", "sourceRef": "event-988191004", "targetRef": "event-988191003"}]}, {"data": {"eventId": "bd37e530-3578-11f0-974a-df614269aae5", "workflowId": "f7a0f7e0-3576-11f0-9cb4-c3090b0731a2", "amqpMessageId": "05ebce22-3257-4feb-90d7-c8b297fb346e"}, "type": "in", "createdAt": "2025-05-20T12:48:33.572Z", "sequences": [{"id": "Flow_0kf593c", "sourceRef": "event-988191003", "targetRef": "event-988191001"}]}, {"data": {"userId": "system", "workflowId": "f7a0f7e0-3576-11f0-9cb4-c3090b0731a2", "amqpMessageId": "b2051f11-79a0-4dad-9de0-c08e533cc114", "eventTemplateId": 988191001, "workflowTemplateId": 988191}, "type": "out", "createdAt": "2025-05-20T12:48:33.575Z", "sequences": [{"id": "Flow_0kf593c", "sourceRef": "event-988191003", "targetRef": "event-988191001"}]}, {"data": {"eventId": "bd441a30-3578-11f0-974a-df614269aae5", "workflowId": "f7a0f7e0-3576-11f0-9cb4-c3090b0731a2", "amqpMessageId": "ac1b760b-ffbb-4d0f-9773-cd8ae2550693"}, "type": "in", "createdAt": "2025-05-20T12:48:33.631Z", "sequences": [{"id": "Flow_1l87kgr", "sourceRef": "event-988191001", "targetRef": "end-event-1"}]}]}'::jsonb, NULL, '2025-05-20 12:35:52.542', '2025-05-20 12:48:33.637', 2, '2025052042-7', '{"userId":"682c3749b09b9b183bf98a02","userName":"Розробник Галина Василівна","isLegal":false,"isIndividualEntrepreneur":false}'::json, false, '{}', '{}', '{}', true, NULL, NULL, '[{"type": "done", "label": "ВИКОНАНО", "description": "", "isStatusesTab": false}]'::jsonb);

INSERT INTO documents
(id, parent_id, document_template_id, document_state_id, cancellation_type_id, "number", is_final, owner_id, created_by, updated_by, "data", description, file_id, file_name, file_type, created_at, updated_at, asic, external_id, file_size)
VALUES('f7a53da0-3576-11f0-9cb4-c3090b0731a2'::uuid, NULL, 988191001, 1, NULL, NULL, true, '682c3749b09b9b183bf98a02', '682c3749b09b9b183bf98a02', '682c3749b09b9b183bf98a02', '{"calculated":{"userId":"682c3749b09b9b183bf98a02","userName":"Розробник Галина Василівна","userFirstName":"Галина","userLastName":"Розробник","userMiddleName":"Василівна","userIpn":"3225928152","docNumber":"2025052042-7","userNameModified":"Розробник Галина Василівна"},"companyInfo":{"createUnit":"Так","findEdrpou":[],"companyName":"ФОП \"Булька і Квантовий Стрибок\"","edrpou":"43922825"},"additionalInfo":{"toggleMoggle":false,"myRadio":"Біл Гейц","myCheckbox":[]}}'::json, NULL, 'ff3e6e60-3576-11f0-9d24-2fd59ec15881', 'Заява.pdf', 'application/pdf', '2025-05-20 12:35:52.570', '2025-05-20 12:36:16.085', '{"asicmanifestFileId":"053ab800-3577-11f0-9d24-2fd59ec15881","filesIds":["ff3e6e60-3576-11f0-9d24-2fd59ec15881"]}'::json, NULL, 2987);

INSERT INTO events
(id, event_template_id, event_type_id, workflow_id, cancellation_type_id, "name", done, created_by, updated_by, "data", created_at, updated_at, document_id, due_date, "version", lock_id)
VALUES('bd2631f0-3578-11f0-974a-df614269aae5'::uuid, 988191002, 5, 'f7a0f7e0-3576-11f0-9cb4-c3090b0731a2'::uuid, NULL, 'Створення юніту', true, 'system', 'system', '{"result":{"create":{"createdAt":"2025-05-20T12:48:33.419Z","operation":"create","unitId":1000000044,"unit":{"id":1000000044,"parentId":null,"basedOn":[],"name":"Test ФОП \"Булька і Квантовий Стрибок\" (43922825)","description":"Тестовий юніт","members":[],"heads":[],"data":{},"menuConfig":{},"allowTokens":[],"headsIpn":["3225928152"],"membersIpn":[]},"isHandled":true}}}'::json, '2025-05-20 12:48:33.424', '2025-05-20 12:48:33.424', NULL, NULL, '1.1.0', NULL);
INSERT INTO events
(id, event_template_id, event_type_id, workflow_id, cancellation_type_id, "name", done, created_by, updated_by, "data", created_at, updated_at, document_id, due_date, "version", lock_id)
VALUES('bd312e70-3578-11f0-974a-df614269aae5'::uuid, 988191004, 3, 'f7a0f7e0-3576-11f0-9cb4-c3090b0731a2'::uuid, NULL, 'Запис в рандомний реєстр (keyId-1)', true, 'system', 'system', '{"result":{"saveToRegisters":{"data":{"data":{"unit":1000000044,"edrpou":"43922825","headCode":"3225928152","companyName":"ФОП \"Булька і Квантовий Стрибок\""},"id":"bd2fa7d0-3578-11f0-b73d-c7eece1e9edb","registerId":1,"keyId":1,"meta":{"user":"liquio-stage","historyMeta":{"accessInfo":{"workflowId":"f7a0f7e0-3576-11f0-9cb4-c3090b0731a2","requestAt":"2025-05-20T12:48:33.472Z"}}},"allowTokens":[],"createdBy":"liquio-stage","updatedBy":"liquio-stage","createdAt":"2025-05-20T12:48:33.485Z","updatedAt":"2025-05-20T12:48:33.485Z","signature":null,"isEncrypted":false}}}}'::json, '2025-05-20 12:48:33.495', '2025-05-20 12:48:33.495', NULL, NULL, '1.1.0', NULL);
INSERT INTO events
(id, event_template_id, event_type_id, workflow_id, cancellation_type_id, "name", done, created_by, updated_by, "data", created_at, updated_at, document_id, due_date, "version", lock_id)
VALUES('bd37e530-3578-11f0-974a-df614269aae5'::uuid, 988191003, 1, 'f7a0f7e0-3576-11f0-9cb4-c3090b0731a2'::uuid, NULL, 'пустий івент об''єднання', true, 'system', 'system', '{"result":{}}'::json, '2025-05-20 12:48:33.539', '2025-05-20 12:48:33.539', NULL, NULL, '1.1.0', NULL);
INSERT INTO events
(id, event_template_id, event_type_id, workflow_id, cancellation_type_id, "name", done, created_by, updated_by, "data", created_at, updated_at, document_id, due_date, "version", lock_id)
VALUES('bd441a30-3578-11f0-974a-df614269aae5'::uuid, 988191001, 1, 'f7a0f7e0-3576-11f0-9cb4-c3090b0731a2'::uuid, NULL, 'Інформування користувачу про', true, 'system', 'system', '{"result":{"notificationEmailByUserId":[{"data":{"list_user_id":["682c3749b09b9b183bf98a02"],"title_message":"Initial email","full_message":"<p>👋 Hi, Галина!</p></div> <div style=''font-size: 18px;line-height: 24px;color: #000;margin: 20px 0;''> <p> Application 2025052042-7 was created.</p>","template_id":1,"not_send":false,"is_encrypted":false,"attachments":[]},"response":{"messageId":4,"usersMessages":[{"userMessageId":3,"userId":"682c3749b09b9b183bf98a02","messageId":4}]}}]}}'::json, '2025-05-20 12:48:33.619', '2025-05-20 12:48:33.619', NULL, NULL, '1.1.0', NULL);

INSERT INTO tasks
(id, task_template_id, workflow_id, "name", description, document_id, signer_users, performer_users, performer_units, tags, "data", cancellation_type_id, finished, finished_at, deleted, created_by, updated_by, due_date, created_at, updated_at, is_entry, copy_from, is_current, performer_usernames, meta, signer_usernames, only_for_heads, is_system, observer_units, performer_users_ipn, labels, "version", archived, archive_data, activity_log, required_performer_units, draft_expired_at, performer_users_email)
VALUES('f7a40520-3576-11f0-9cb4-c3090b0731a2'::uuid, 988191001, 'f7a0f7e0-3576-11f0-9cb4-c3090b0731a2'::uuid, NULL, NULL, 'f7a53da0-3576-11f0-9cb4-c3090b0731a2'::uuid, '{}', '{682c3749b09b9b183bf98a02}', '{}', '{}', '{}'::json, NULL, true, '2025-05-20 12:36:16.072', false, '682c3749b09b9b183bf98a02', '682c3749b09b9b183bf98a02', NULL, '2025-05-20 12:35:52.562', '2025-05-20 12:36:16.073', true, NULL, true, '{"Розробник Галина Василівна"}', '{"isRead":true,"commitRequestMeta":{"method":"POST","url":"/documents/f7a53da0-3576-11f0-9cb4-c3090b0731a2/sign?commit=true&type=file","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36","userIp":{"remoteAddress":"10.233.83.76","xForwardedFor":"94.131.247.44"},"requestId":"9746ab6695a6003eee51b5cb60594968","uriPattern":"POST:/documents/f7a53da0-3576-11f0-9cb4-c3090b0731a2/sign?commit=true&type=file"}}'::json, '{}', false, false, '{}', '{}', '{}', '1.0.1', false, '{}'::jsonb, '[]'::jsonb, '{}', NULL, '{}');
