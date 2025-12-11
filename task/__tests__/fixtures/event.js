const EVENT_FIXTURES = [
  {
    id: '915f8860-de3a-11ed-829e-376793cdec28',
    event_template_id: 31689002,
    event_type_id: 3,
    workflow_id: '954f1f35-829b-4c02-9949-f326b94fb9f8',
    cancellation_type_id: null,
    name: 'Відправка даних до ДСНС',
    done: true,
    created_by: 'system',
    updated_by: 'system',
    data: {
      result: {
        sendToExternalService: {
          sendingResult: { applicationNumber: '10000', applicationId: '13', sentPackage: { status: 'success', declaration_date: '2023-04-19' } },
        },
      },
    },
    created_at: '2023-04-18T22:44:24.678Z',
    updated_at: '2023-04-18T22:44:24.678Z',
    document_id: null,
    due_date: null,
    version: '1.0.113',
    lock_id: null,
  },
];

module.exports = { EVENT_FIXTURES };
