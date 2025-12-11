class DictionaryModels {
  constructor() {
    if (!DictionaryModels.singleton) {
      DictionaryModels.singleton = this;
    }

    return DictionaryModels.singleton;
  }

  async getAll() {
    const dictionaries = {
      'test-1': [
        {
          id: 1,
          name: 'Test 1',
          created_at: '2019-01-31T22:00:00.000Z',
          updated_at: '2019-01-31T22:00:00.000Z'
        },
        {
          id: 2,
          name: 'Test 2',
          created_at: '2019-01-31T22:00:00.000Z',
          updated_at: '2019-01-31T22:00:00.000Z'
        },
        {
          id: 3,
          name: 'Test 3',
          created_at: '2019-01-31T22:00:00.000Z',
          updated_at: '2019-01-31T22:00:00.000Z'
        }
      ],
      'test-2': [
        {
          id: 1,
          name: 'Test 1',
          created_at: '2019-01-31T22:00:00.000Z',
          updated_at: '2019-01-31T22:00:00.000Z'
        },
        {
          id: 2,
          name: 'Test 2',
          created_at: '2019-01-31T22:00:00.000Z',
          updated_at: '2019-01-31T22:00:00.000Z'
        },
        {
          id: 3,
          name: 'Test 3',
          created_at: '2019-01-31T22:00:00.000Z',
          updated_at: '2019-01-31T22:00:00.000Z'
        }
      ]
    };

    return dictionaries;
  }

  async getByName(name) {
    if (name !== 'test-1') {
      return;
    }

    return [
      {
        id: 1,
        name: 'Test 1',
        created_at: '2019-01-31T22:00:00.000Z',
        updated_at: '2019-01-31T22:00:00.000Z'
      },
      {
        id: 2,
        name: 'Test 2',
        created_at: '2019-01-31T22:00:00.000Z',
        updated_at: '2019-01-31T22:00:00.000Z'
      },
      {
        id: 3,
        name: 'Test 3',
        created_at: '2019-01-31T22:00:00.000Z',
        updated_at: '2019-01-31T22:00:00.000Z'
      }
    ];
  }
}

module.exports = DictionaryModels;
