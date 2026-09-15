import React from 'react';
import classNames from 'classnames';
import DisclaimerUntyped from 'components/Disclaimer';
import theme from 'theme';

const Disclaimer = DisclaimerUntyped as unknown as React.ComponentType<Record<string, unknown>>;

// `theme` has no real `material` field in this app's config shape — this
// destructuring always yields `undefined`, a pre-existing quirk already
// documented (and preserved the same way) in `TextBlock.tsx`.
const { material } = theme as unknown as { material?: boolean };

interface RegisterFieldValue {
  value?: unknown;
  stringified?: string;
  [key: string]: unknown;
}

interface RenderFieldsValue {
  unzr?: { value?: unknown };
  birthday?: {
    date?: string;
    country?: string;
    place?: string;
  };
  gender?: { value?: string };
  passport?: {
    type?: string;
    series?: string;
    number?: string;
    issuedBy?: string;
    issuedAt?: string;
    expireDate?: string;
  };
  address?: {
    index?: { value?: unknown };
    region?: RegisterFieldValue;
    district?: RegisterFieldValue;
    city?: RegisterFieldValue;
    street?: RegisterFieldValue;
    building?: { value?: unknown };
    apartment?: { value?: unknown };
  };
  index?: { value?: unknown };
  phone?: { value?: unknown };
  email?: { value?: unknown };
  [key: string]: unknown;
}

interface RenderFieldsProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  userInfo?: { info?: { name?: string; ipn?: string } };
  value?: RenderFieldsValue;
  fields: string[];
  citizenShipExists: boolean;
  hiddenFields: string[];
}

const RenderFields = ({
  t,
  classes,
  userInfo,
  value,
  fields,
  citizenShipExists,
  hiddenFields,
}: RenderFieldsProps) => {
  const renderFieldsSeparateByComma = (fields: unknown[]) => {
    const filtered = fields.filter(Boolean);

    return filtered.map((field, index) => {
      if (index === filtered.length - 1) {
        return field;
      }
      return `${field}, `;
    });
  };

  const filteredFields = fields.filter((field) => {
    return !hiddenFields?.includes(field);
  });

  return (
    <>
      <div
        className={classNames({
          'user-info': material,
          [classes.materialWrapper]: !!material,
          [classes.contentWrapper]: !material,
        })}
      >
        <div
          className={classNames({
            [classes.content]: !material,
          })}
        >
          <div
            className={classNames({
              'user-name': material,
              [classes.contentHeadline]: !material,
            })}
          >
            {userInfo?.info?.name}
          </div>

          <div
            className={classNames({
              'user-item': material,
            })}
          >
            <div
              className={classNames({
                'user-item-title': material,
                [classes.contentText]: !material,
              })}
            >
              {t('ipn')}
            </div>
            <div
              className={classNames({
                'user-item-value': material,
                [classes.contentTextValue]: !material,
              })}
            >
              {userInfo?.info?.ipn}
            </div>
          </div>

          {filteredFields?.includes('unzr') && (
            <div
              className={classNames({
                'user-item': material,
              })}
            >
              <div
                className={classNames({
                  'user-item-title': material,
                  [classes.contentText]: !material,
                })}
              >
                {t('unzr')}
              </div>
              <div
                className={classNames({
                  'user-item-value': material,
                  [classes.contentTextValue]: !material,
                })}
              >
                {value?.unzr?.value as React.ReactNode}
              </div>
            </div>
          )}

          <div
            className={classNames({
              [classes.flexWrapper]: !material,
            })}
          >
            {filteredFields?.includes('birthday') &&
              !hiddenFields.includes('birthday.date') && (
                <div
                  className={classNames({
                    'user-item': material,
                  })}
                >
                  <div
                    className={classNames({
                      'user-item-title': material,
                      [classes.contentText]: !material,
                    })}
                  >
                    {t('birthday')}
                  </div>
                  <div
                    className={classNames({
                      'user-item-value': material,
                      [classes.contentTextValue]: !material,
                    })}
                  >
                    {value?.birthday?.date}
                    {t('byYear')}
                  </div>
                </div>
              )}
            <div>
              {filteredFields?.includes('gender') && (
                <div
                  className={classNames({
                    'user-item': material,
                  })}
                >
                  <div
                    className={classNames({
                      'user-item-title': material,
                      [classes.contentText]: !material,
                    })}
                  >
                    {t('gender')}
                  </div>
                  <div
                    className={classNames({
                      'user-item-value': material,
                      [classes.contentTextValue]: !material,
                    })}
                  >
                    {t(value?.gender?.value as string)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {citizenShipExists && (
            <div
              className={classNames({
                'user-item': material,
              })}
            >
              <div
                className={classNames({
                  'user-item-title': material,
                  [classes.contentText]: !material,
                })}
              >
                {t('citizenShip')}
              </div>
              <div
                className={classNames({
                  'user-item-value': material,
                  [classes.contentTextValue]: !material,
                })}
              >
                {t('citizenShipUkraine')}
              </div>
            </div>
          )}

          {filteredFields?.includes('birthday') &&
            value?.birthday?.country &&
            !hiddenFields.includes('birthday.country') && (
              <div
                className={classNames({
                  'user-item': material,
                })}
              >
                <div
                  className={classNames({
                    'user-item-title': material,
                    [classes.contentText]: !material,
                  })}
                >
                  {t('birthdayCountry')}
                </div>
                <div
                  className={classNames({
                    'user-item-value': material,
                    [classes.contentTextValue]: !material,
                  })}
                >
                  {value?.birthday?.country}
                </div>
              </div>
            )}

          {filteredFields?.includes('birthday') &&
            value?.birthday?.place &&
            !hiddenFields.includes('birthday.place') && (
              <div
                className={classNames({
                  'user-item': material,
                })}
              >
                <div
                  className={classNames({
                    'user-item-title': material,
                    [classes.contentText]: !material,
                  })}
                >
                  {t('birthdayPlace')}
                </div>
                <div
                  className={classNames({
                    'user-item-value': material,
                    [classes.contentTextValue]: !material,
                  })}
                >
                  {value?.birthday?.place}
                </div>
              </div>
            )}

          {filteredFields?.includes('passport') && (
            <>
              <div
                className={classNames({
                  'user-item': material,
                })}
              >
                <div
                  className={classNames({
                    'user-item-title': material,
                    [classes.contentText]: !material,
                  })}
                >
                  {t(
                    value?.passport?.type === 'idCard'
                      ? 'idPassportInfo'
                      : 'passportInfo',
                  )}
                </div>
                <div
                  className={classNames({
                    'user-item-value': material,
                    [classes.contentTextValue]: !material,
                  })}
                >
                  {value?.passport?.series}
                  {value?.passport?.number}
                </div>
              </div>

              <div
                className={classNames({
                  'user-item': material,
                })}
              >
                <div
                  className={classNames({
                    'user-item-title': material,
                    [classes.contentText]: !material,
                  })}
                >
                  {t(
                    value?.passport?.type === 'idCard'
                      ? 'idIssuedBy'
                      : 'passportIssuedBy',
                  )}
                </div>
                <div
                  className={classNames({
                    'user-item-value': material,
                    [classes.contentTextValue]: !material,
                  })}
                >
                  {value?.passport?.issuedBy}
                </div>
              </div>

              <div
                className={classNames({
                  [classes.flexWrapper]: !material,
                  [classes.border]: !!material,
                })}
              >
                <div
                  className={classNames({
                    'user-item': material,
                  })}
                >
                  <div
                    className={classNames({
                      'user-item-title': material,
                      [classes.contentText]: !material,
                    })}
                  >
                    {t('issuedAt')}
                  </div>
                  <div
                    className={classNames({
                      'user-item-value': material,
                      [classes.contentTextValue]: !material,
                    })}
                  >
                    {value?.passport?.issuedAt}
                    {t('byYear')}
                  </div>
                </div>
                {value?.passport?.expireDate ? (
                  <div
                    className={classNames({
                      'user-item': material,
                    })}
                  >
                    <div
                      className={classNames({
                        'user-item-title': material,
                        [classes.contentText]: !material,
                      })}
                    >
                      {t('expireDate')}
                    </div>
                    <div
                      className={classNames({
                        'user-item-value': material,
                        [classes.contentTextValue]: !material,
                      })}
                    >
                      {value?.passport?.expireDate}
                      {t('byYear')}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}

          {filteredFields?.includes('address') && (
            <div
              className={classNames({
                'user-item': material,
              })}
            >
              <div
                className={classNames({
                  'user-item-title': material,
                  [classes.contentText]: !material,
                })}
              >
                {t('address')}
              </div>
              <div
                className={classNames({
                  'user-item-value': material,
                  [classes.contentTextValue]: !material,
                })}
              >
                {renderFieldsSeparateByComma([
                  value?.index?.value || value?.address?.index?.value,
                  value?.address?.region?.stringified,
                  value?.address?.district?.stringified,
                  value?.address?.city?.stringified,
                  value?.address?.street?.stringified,
                  value?.address?.building?.value,
                  value?.address?.apartment?.value
                    ? t('apartment', {
                        apartment: value?.address?.apartment?.value,
                      })
                    : null,
                ]) as React.ReactNode}
              </div>
            </div>
          )}

          {filteredFields?.includes('phone') && (
            <div
              className={classNames({
                'user-item': material,
              })}
            >
              <div
                className={classNames({
                  'user-item-title': material,
                  [classes.contentText]: !material,
                })}
              >
                {t('phone')}
              </div>
              <div
                className={classNames({
                  'user-item-value': material,
                  [classes.contentTextValue]: !material,
                })}
              >
                {value?.phone?.value as React.ReactNode}
              </div>
            </div>
          )}

          {filteredFields?.includes('email') && (
            <div
              className={classNames({
                'user-item': material,
              })}
            >
              <div
                className={classNames({
                  'user-item-title': material,
                  [classes.contentText]: !material,
                })}
              >
                {t('email')}
              </div>
              <div
                className={classNames({
                  'user-item-value': material,
                  [classes.contentTextValue]: !material,
                })}
              >
                {value?.email?.value as React.ReactNode}
              </div>
            </div>
          )}
        </div>
      </div>

      {filteredFields?.includes('email') ||
      filteredFields?.includes('phone') ? (
        <div className={classNames(classes.centerMarginBottom)}>
          <Disclaimer
            text={t('changeContactInfo')}
            link={'/profile'}
            linkText={t('profileLinkText')}
          />
        </div>
      ) : null}
    </>
  );
};

export default RenderFields;
