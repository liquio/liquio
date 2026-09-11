export default (allowTokens, t, classes) => {
  return [
    {
      type: 'object',
      properties: {
        strictAccess: {
          type: 'object',
          properties: {
            strictAccess: {
              noMargin: true,
              control: 'toggle',
              onText: t('strictAccess'),
            },
          },
        },
      },
    },
    {
      type: 'object',
      properties: {
        keyAccess: {
          description: t('keyAccess'),
          className: classes.desc,
          type: 'array',
          addItem: {
            text: t('addUnit')
          },
          outlined: false,
          disableBoxShadow: true,
          notRequiredLabel: '',
          items: {
            properties: {
              unit: {
                control: 'unit.list',
                description: t('unit'),
                darkTheme: true,
                variant: 'outlined',
                multiple: false,
                noMargin: true,
                maxWidth: 'none'
              },
              keys: {
                type: 'object',
                control: 'form.group',
                outlined: false,
                blockDisplay: true,
                notRequiredLabel: '',
                description: t('keys'),
                properties: {
                  allowRead: {
                    control: 'toggle',
                    onText: t('allowRead'),
                    noMargin: true,
                  },
                  allowCreate: {
                    control: 'toggle',
                    onText: t('allowCreate'),
                    noMargin: true,
                  },
                  allowUpdate: {
                    control: 'toggle',
                    onText: t('allowUpdate'),
                    isDisabled: allowTokens,
                    noMargin: true,
                  },
                  allowDelete: {
                    control: 'toggle',
                    onText: t('allowDelete'),
                    noMargin: true,
                  },
                  allowHistory: {
                    control: 'toggle',
                    onText: t('allowHistory'),
                    noMargin: true,
                  },
                },
                required: [],
              },
              divider: {
                control: 'divider',
                margin: 25,
                hidden: '(a,b,value) => !value || !value.keys || Object.keys(value.keys).every(key => !value.keys[key])',
                styles: {
                  opacity: 0.15,
                  background: '#FFF'
                }
              },
              allowHead: {
                type: 'string',
                control: 'radio.group',
                description: t('WhoCanChange'),
                notRequiredLabel: '',
                hidden: '(a,b,value) => !value || !value.keys || Object.keys(value.keys).every(key => !value.keys[key])',
                defaultValue: 'all',
                items: [
                  {
                    id: 'all',
                    title: t('allMembers'),
                  },
                  {
                    id: 'head',
                    title: t('onlyHeads'),
                  },
                ],
                rowDirection: true,
              },
              divider2: {
                control: 'divider',
                margin: 25,
                styles: {
                  opacity: 0.15,
                  background: '#FFF'
                }
              },
              display: {
                type: 'object',
                control: 'form.group',
                outlined: false,
                blockDisplay: true,
                notRequiredLabel: '',
                description: t('display'),
                properties: {
                  hideKey: {
                    control: 'toggle',
                    onText: t('hideKey'),
                    noMargin: true,
                  }
                },
                required: [],
              },
              keyAllowTokensTitle: {
                control: 'text.block',
                hidden: !allowTokens,
                htmlBlock: `<p style='color: #fff'>${t(
                  'keyAllowTokensTitle',
                )}</p>`,
              },
            },
          },
        },
      },
    },
  ];
};
