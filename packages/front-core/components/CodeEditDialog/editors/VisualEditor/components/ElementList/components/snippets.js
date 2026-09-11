const snippets = [
  {
    name: 'String',
    type: 'control',
    key: 'string',
    data: '{ "code" : { "type": "string", "description": "String", "public": true }}'
  },
  {
    name: 'Number',
    type: 'control',
    key: 'number',
    data: '{ "code" : { "type": "number", "description": "Number", "public": true }}'
  },
  {
    name: 'Date',
    type: 'control',
    key: 'date',
    data: '{ "code" : { "type": "string", "description": "Date", "pattern": "^\\d{4}-\\d{2}-\\d{2}$|^$", "isDateValid": true }}'
  },
  {
    name: 'TAX ID',
    type: 'control',
    key: 'rnokpp',
    data: '{ "code" : { "type": "string", "description": "TAX ID", "maxLength": 10, "public": true }}'
  },
  {
    name: 'Document series and number',
    type: 'control',
    key: 'document',
    data: '{ "code" : { "type": "string", "description": "Document series and number", "maxLength": 9, "public": true }}'
  },
  {
    name: 'Document type',
    type: 'control',
    key: 'documentType',
    data: '{ "code" : { "type": "string", "description": "Document type", "options": [{ "id": "1", "name": "паспорт"}, { "id": "2", "name": "водійське посвідчення"}], "public": true }}'
  },
  {
    name: 'Last name',
    type: 'control',
    key: 'lastName',
    data: '{ "code" : { "type": "string", "description": "Last name", "maxLength": 60, "onlyUkrainianLettersHyphenSpace": true, "containLetters": true, "notContainMoreOnehyphenOrSpace": true }}'
  },
  {
    name: 'First name',
    type: 'control',
    key: 'firstName',
    data: '{ "code" : { "type": "string", "description": "First name", "maxLength": 60, "onlyUkrainianLettersHyphenSpace": true, "containLetters": true, "notContainMoreOnehyphenOrSpace": true }}'
  },
  {
    name: 'Middle name',
    type: 'control',
    key: 'middleName',
    data: '{ "code" : { "type": "string", "description": "Middle name", "maxLength": 60, "onlyUkrainianLettersHyphenSpace": true, "containLetters": true, "notContainMoreOnehyphenOrSpace": true }}'
  }
];

export default snippets;
