export const requestExternalData =
  (requestData = {}) =>
  () => {
    const { service, method } = requestData;

    if (service === 'bank' && method === 'init') {
      return {
        workflowId: '25ea4c0a-4039-11ef-84ed-0050569766a3',
        formDiia: {
          type: 'object',
          description: 'Анкетні дані',
          properties: {
            incomeSources: {
              type: 'array',
              description: 'Вкажіть джерела надходження коштів та інших цінностей на рахунки ФОП:',
              control: 'checkbox.group',
              rowDirection: false,
              items: [
                {
                  id: 'cash',
                  title: 'Зарахування готівкових коштів'
                },
                {
                  id: 'nonCash',
                  title: 'Безготівкові зарахування коштів від контрагентів по основній діяльності'
                },
                {
                  id: 'loan',
                  title: 'У вигляді фінансової допомоги, позики'
                },
                {
                  id: 'credit',
                  title: 'Отримання кредитів'
                },
                {
                  id: 'securities',
                  title: 'Від продажу цінних паперів'
                },
                {
                  id: 'other',
                  title: 'Інші джерела'
                }
              ],
              checkValid: [
                {
                  isValid: '(a,b,c) => !!a?.length',
                  errorText: "Обов'язкове поле"
                }
              ],
              bottomSample: true
            },
            incomeSourceOtherDetailsTitle: {
              control: 'text.block',
              hidden: "(a) => !a?.formDiia?.incomeSources?.includes('other')",
              noMargin: true,
              htmlBlock:
                "<p style='font-size: 20px; line-height: 24px;'>Вкажіть інші джерела надходження коштів:</p>"
            },
            incomeSourceOtherDetails: {
              type: 'string',
              hidden: "(a) => !a?.formDiia?.incomeSources?.includes('other')",
              checkRequired: "(a, b, c) => !!c?.formDiia?.incomeSources?.includes('other')",
              cleanWhenHidden: true,
              checkValid: [
                {
                  isValid: '(a,b,c) => /^[`\'’А-Яа-яёЁЇїІіЄєҐґ .,\\-"]+$/.test(a)',
                  errorText: 'Будь ласка, перевірте коректність введеного значення'
                }
              ]
            },
            incomeAmountTitle: {
              control: 'text.block',
              noMargin: true,
              htmlBlock:
                "<p style='font-size: 20px; line-height: 24px;'>Вкажіть суму доходу від господарської діяльності (в грн. за звітний період - рік):</p>"
            },
            incomeAmount: {
              type: 'string',
              checkRequired: '(a, b, c) => true',
              checkValid: [
                {
                  isValid: '(a,b,c) => /^\\d+$/.test(a)',
                  errorText: 'Будь ласка, перевірте коректність введеного значення'
                }
              ]
            },
            maxPlannedIncomeAmount: {
              type: 'string',
              description:
                'Запланована максимальна сума операцій (надходження коштів на рахунки в АТ «СЕНС БАНК) в місяць (грн./еквівалент в грн.):',
              sample:
                "<div class='bank-block'><p class='info-block-icon'>☝</p><div>У разі перевищення зазначеної максимальної суми надходжень на рахунки, банком можуть бути запитані додаткові документи.</div></div>",
              control: 'radio.group',
              rowDirection: false,
              checkRequired: '(a, b, c) => true',
              items: [
                {
                  id: '200k',
                  title: '200000'
                },
                {
                  id: '350k',
                  title: '350000'
                },
                {
                  id: '500k',
                  title: '500000'
                },
                {
                  id: 'other',
                  title: 'Інша сума'
                }
              ]
            },
            maxPlannedIncomeAmountOtherDetailsTitle: {
              control: 'text.block',
              hidden: "(a) => !a?.formDiia?.maxPlannedIncomeAmount?.includes('other')",
              noMargin: true,
              htmlBlock: "<p style='font-size: 20px; line-height: 24px;'>Вкажіть суму:</p>"
            },
            maxPlannedIncomeAmountOtherDetails: {
              type: 'string',
              hidden: "(a) => !a?.formDiia?.maxPlannedIncomeAmount?.includes('other')",
              checkRequired:
                "(a, b, c) => !!c?.formDiia?.maxPlannedIncomeAmount?.includes('other')",
              cleanWhenHidden: true,
              checkValid: [
                {
                  isValid: '(a,b,c) => /^\\d{4,}$/.test(a)',
                  errorText: 'Будь ласка, перевірте коректність введеного значення'
                }
              ]
            },
            vat: {
              type: 'boolean',
              description: 'Чи є Ви платником податку на додану вартість (ПДВ)?',
              control: 'radio.group',
              checkRequired: '(a, b, c) => true',
              items: [
                {
                  id: true,
                  title: 'Так'
                },
                {
                  id: false,
                  title: 'Ні'
                }
              ]
            },
            business: {
              type: 'boolean',
              description: 'Чи були зміни в напрямках підприємницької діяльності?',
              control: 'radio.group',
              checkRequired: '(a, b, c) => true',
              items: [
                {
                  id: true,
                  title: 'Так'
                },
                {
                  id: false,
                  title: 'Ні'
                }
              ]
            },
            accounts: {
              type: 'boolean',
              description:
                'Чи є у Вас відкриті рахунки ФОП (поточні, депозитні, карткові, кредитні) в інших банках?',
              control: 'radio.group',
              checkRequired: '(a, b, c) => true',
              items: [
                {
                  id: true,
                  title: 'Так'
                },
                {
                  id: false,
                  title: 'Ні'
                }
              ]
            },
            accountDetails: {
              type: 'array',
              description: 'Деталі рахунку',
              hidden: '(a) => !a?.formDiia?.accounts',
              checkRequired: '(a, b, c) => c?.formDiia?.accounts',
              items: {
                type: 'object',
                properties: {
                  iban: {
                    type: 'string',
                    description: '№ рахунку IBAN:',
                    checkRequired: '(a, b, c) => true',
                    checkValid: [
                      {
                        isValid: '(a,b,c) => /^UA\\d{27}$/.test(a)',
                        errorText: 'Будь ласка, перевірте коректність введеного значення'
                      }
                    ]
                  },
                  bankName: {
                    type: 'string',
                    description: 'Найменування банку:',
                    checkRequired: '(a, b, c) => true',
                    checkValid: [
                      {
                        isValid: '(a,b,c) => /^[`\'’А-Яа-яёЁЇїІіЄєҐґ .,\\-"]+$/.test(a)',
                        errorText: 'Будь ласка, перевірте коректність введеного значення'
                      }
                    ]
                  }
                },
                required: ['iban', 'bankName']
              },
              cleanWhenHidden: true
            },
            hasLicenses: {
              type: 'boolean',
              description:
                'Чи маєте Ви ліцензії (дозволи) на право здійснення певних операцій (діяльності)?',
              control: 'radio.group',
              checkRequired: '(a, b, c) => true',
              items: [
                {
                  id: true,
                  title: 'Так'
                },
                {
                  id: false,
                  title: 'Ні'
                }
              ]
            },
            licenses: {
              type: 'array',
              description: 'Деталі ліцензії',
              hidden: '(a) => !a?.formDiia?.hasLicenses',
              checkRequired: '(a, b, c) => c?.formDiia?.hasLicenses',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Найменування',
                    checkRequired: '(a, b, c) => true',
                    checkValid: [
                      {
                        isValid: '(a,b,c) => /^[\\d`\'’А-Яа-яёЁЇїІіЄєҐґ .,\\-"]+$/.test(a)',
                        errorText: 'Будь ласка, перевірте коректність введеного значення'
                      }
                    ]
                  },
                  serialAndNumber: {
                    type: 'string',
                    description: 'Серія та номер',
                    checkRequired: '(a, b, c) => true',
                    checkValid: [
                      {
                        isValid: '(a,b,c) => /^[\\da-zA-Z`\'’А-Яа-яёЁЇїІіЄєҐґ .,\\-"]+$/.test(a)',
                        errorText: 'Будь ласка, перевірте коректність введеного значення'
                      }
                    ]
                  },
                  issueDate: {
                    type: 'string',
                    description: 'Дата видачі',
                    checkRequired: '(a, b, c) => true',
                    checkValid: [
                      {
                        isValid: '(a,b,c) => /^\\d{2}\\.\\d{2}\\.\\d{4}$/.test(a)',
                        errorText: 'Будь ласка, вкажіть коректну дату у форматі "ДД.ММ.РРРР"'
                      }
                    ]
                  },
                  validityDate: {
                    type: 'string',
                    description: 'Термін дії до',
                    checkValid: [
                      {
                        isValid: '(a,b,c) => /^\\d{2}\\.\\d{2}\\.\\d{4}$/.test(a)',
                        errorText: 'Будь ласка, вкажіть коректну дату у форматі "ДД.ММ.РРРР"'
                      }
                    ]
                  },
                  issuedBy: {
                    type: 'string',
                    description: 'Орган, що видав',
                    checkRequired: '(a, b, c) => true',
                    checkValid: [
                      {
                        isValid: '(a,b,c) => /^[`\'’А-Яа-яёЁЇїІіЄєҐґ .,\\-"]+$/.test(a)',
                        errorText: 'Будь ласка, перевірте коректність введеного значення'
                      }
                    ]
                  }
                },
                required: ['name', 'serialAndNumber', 'issueDate', 'issuedBy']
              },
              cleanWhenHidden: true
            },
            pep: {
              type: 'boolean',
              description: "Чи є Ви політично значущою особою або маєте зв'язок з такими особами?",
              sample:
                "<div class='bank-block'><p class='info-block-icon'>☝</p><div>Політично значуща особа - особа, що є депутатом/займає керівні посади на державних підприємствах тощо.</div></div>",
              control: 'radio.group',
              checkRequired: '(a, b, c) => true',
              items: [
                {
                  id: true,
                  title: 'Так'
                },
                {
                  id: false,
                  title: 'Ні'
                }
              ]
            },
            fatcaRfCrs: {
              type: 'boolean',
              description:
                "Чи маєте Ви ознаки зв'язку з США та/або ділові зв'язки з російською федерацією та/або чи є Ви податковим резидентом інших юрисдикцій окрім України та США?",
              sample:
                '<div class=\'bank-block\'><p class=\'info-block-icon\'>☝</p><div><a target="_blank" href="https://sense.top/detail">Детальніше про ознаки за посиланням</a></div></div>',
              control: 'radio.group',
              checkRequired: '(a, b, c) => true',
              items: [
                {
                  id: true,
                  title: 'Так'
                },
                {
                  id: false,
                  title: 'Ні'
                }
              ]
            },
            agreement: {
              type: 'array',
              description: 'Підтвердіть ознайомлення з умовами онлайн-заявки та з довідкою ФГВФО',
              sample:
                '<div class=\'bank-block\'><p class=\'info-block-icon\'>☝</p><div><a target="_blank" href="https://sensebank.com.ua/usloviya-oformleniya-onlajn-zayavki" onclick="window.open(\'https://sensebank.com.ua/upload/dovidka-fgvfo.pdf\')">Умови онлайн-заявки та довідка ФГВФО</a></div></div>',
              control: 'checkbox.group',
              rowDirection: false,
              items: [
                {
                  id: 'checked',
                  title: 'Ознайомлений та погоджуюсь'
                }
              ],
              checkValid: [
                {
                  isValid: '(a,b,c) => !!a?.length',
                  errorText: "Обов'язкове поле"
                }
              ],
              bottomSample: true
            },
            package: {
              type: 'string',
              description: 'Ваш тариф для бізнес рахунку',
              control: 'radio.group',
              rowDirection: false,
              displayAllSamples: true,
              checkRequired: '(a, b, c) => true',
              items: [
                {
                  id: 'head',
                  title: 'Head',
                  sample:
                    "<div style='color: '#444444'; margin-top: -10px'>Щомісячна вартість пакету</div><div>99 грн.</div><div style='color: '#444444'; margin-top: 20px'>Відкриття та обслуговування рахунку</div><div>безкоштовно</div><div style='color: '#444444'; margin-top: 20px'>Платежі по Україні на юридичних осіб і ФОП</div><div>безкоштовно</div><div style='color: '#444444'; margin-top: 20px'>Перерахування на рахунок/картку ФО в Sense Bank</div><div>безкоштовно</div><div style='color: '#444444'; margin-top: 20px'>Поповнення рахунку безготівково та готівкою через банкомати Sense Bank, термінали партнерів</div><div>безкоштовно</div><div style='color: '#444444'; margin-top: 20px'>Випуск цифрової бізнес-картки до рахунку</div><div>безкоштовно</div><div style='color: '#444444'; margin-top: 20px'>Зняття готівки з бізнес-карткою</div><div>1% мін. 50 грн.</div><div style='color: '#444444'; margin-top: 10px'><a target=\"_blank\" href=\"https://sensebank.com.ua/packages/paket-head\">Детальніше</a>"
                }
              ]
            }
          },
          required: [
            'incomeSources',
            'incomeAmount',
            'maxPlannedIncomeAmount',
            'vat',
            'business',
            'accounts',
            'hasLicenses',
            'pep',
            'fatcaRfCrs',
            'agreement',
            'package'
          ]
        }
      };
    }

    return [];
  };

export default { requestExternalData };
