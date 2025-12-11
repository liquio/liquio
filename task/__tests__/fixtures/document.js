const GENERIC_DOCUMENT_FIXTURE = {
  parent_id: null,
  document_state_id: 1,
  cancellation_type_id: null,
  number: null,
  is_final: false,
  owner_id: 'system',
  created_by: 'system',
  updated_by: 'dsns',
  data: '{}',
  description: null,
  file_id: null,
  file_name: null,
  file_type: null,
  created_at: '2024-05-13T11:17:30.432Z',
  updated_at: '2024-05-13T11:24:30.553Z',
  asic: '{"asicmanifestFileId":null,"filesIds":[]}',
  external_id: null,
  file_size: null,
};

const DOCUMENT_FIXTURES = [
  {
    ...GENERIC_DOCUMENT_FIXTURE,
    id: '6348ec00-111a-11ef-b95e-15b9ffbcc467',
    document_template_id: 31689003,
    data: {
      status: 4,
      reason:
        'Не дотримано вимоги пункту 2 Прстанови КМУ 440 від 05.06.2013; Не дотримано вимоги пункту 5 Прстанови КМУ 440 від 05.06.2013; Не дотримано вимоги пункту 8 Прстанови КМУ 440 від 05.06.2013. А саме: Test',
    },
  },
  {
    ...GENERIC_DOCUMENT_FIXTURE,
    id: '875ae259-d19e-456a-973e-5137e2244146',
    document_template_id: 31689003,
    data: {
      status: 4,
      reason:
        'Не дотримано вимоги пункту 2 Прстанови КМУ 440 від 05.06.2013; Не дотримано вимоги пункту 5 Прстанови КМУ 440 від 05.06.2013; Не дотримано вимоги пункту 8 Прстанови КМУ 440 від 05.06.2013. А саме: Test',
    },
  },
  {
    ...GENERIC_DOCUMENT_FIXTURE,
    id: '8644dfbf-c590-4aae-b55e-01f33ae86460',
    document_template_id: 31689003,
    data: {
      status: 4,
      reason:
        'Не дотримано вимоги пункту 2 Прстанови КМУ 440 від 05.06.2013; Не дотримано вимоги пункту 5 Прстанови КМУ 440 від 05.06.2013; Не дотримано вимоги пункту 8 Прстанови КМУ 440 від 05.06.2013. А саме: Test',
    },
  },
  {
    ...GENERIC_DOCUMENT_FIXTURE,
    id: 'ef279ad6-386a-4c6b-8eb2-af4e2d3fa446',
    document_template_id: 31689003,
    data: {
      status: 4,
      reason:
        'Не дотримано вимоги пункту 2 Прстанови КМУ 440 від 05.06.2013; Не дотримано вимоги пункту 5 Прстанови КМУ 440 від 05.06.2013; Не дотримано вимоги пункту 8 Прстанови КМУ 440 від 05.06.2013. А саме: Test',
    },
    file_id: '936c8a81-ae0d-46d5-9b26-408bcff4ab54',
    file_name: '936c8a81-ae0d-46d5-9b26-408bcff4ab54.pdf',
    file_type: 'application/pdf',
  },
  {
    ...GENERIC_DOCUMENT_FIXTURE,
    id: '780dbe17-20fb-4934-84d9-542e44c19d9e',
    document_template_id: 161243002,
    data: {
      isEnabled: false,
      calculated: {
        ipn: '3277334387',
        signersArray: [
          { firstName: 'Микола', lastName: 'Тест', middleName: 'Максимович', ipn: '8888888888', email: 'gogigogotes.t.987789987789987789@gmail.com' },
          { firstName: 'Артур', lastName: 'Тестрибаков', middleName: 'Андрійович', ipn: '5421463126', email: 'johnsnow698754999@gmail.com' },
        ],
      },
    },
  },
  {
    ...GENERIC_DOCUMENT_FIXTURE,
    id: '12345678-1234-1234-1234-123456789abc',
    document_template_id: 31689003,
    owner_id: '61efddaa351d6219eee09043',
    created_by: '61efddaa351d6219eee09043',
    updated_by: '61efddaa351d6219eee09043',
    data: '{"test": true}',
    file_id: 'test-file-id-123',
    file_name: 'test-file.pdf',
    file_type: 'application/pdf',
    file_size: 1024,
    asic: '{"asicmanifestFileId":"test-asic-manifest-id","filesIds":["test-file-id-123"]}',
  },
];

module.exports = { DOCUMENT_FIXTURES };
