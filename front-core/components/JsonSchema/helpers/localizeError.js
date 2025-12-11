export default (t) => (error) => {
  let out = '';
  const { params } = error || {};
  const n = (params || {}).limit;
  switch (error.keyword) {
    case 'checkValid':
      out = error.errorText || t('CheckValid');
      break;
    case '$ref':
      out = t('SchemaNotFound', { ref: error.params.ref });
      break;
    case 'additionalItems':
    case 'maxItems':
      out = t('ShouldIncludeLessThan', { n });
      break;
    case 'additionalProperties':
      out = t('ShouldNotInclude');
      break;
    case 'anyOf':
    case 'const':
    case 'contains':
    case 'custom':
    case 'enum':
    case 'switch':
    case 'type':
      out = t('NotEquilsTo');
      break;
    case 'dependencies':
      out = t('HaveNoDepencies');
      break;
    case 'exclusiveMaximum':
    case 'exclusiveMinimum':
    case 'formatMaximum':
    case 'formatMinimum':
    case 'maximum':
    case 'minimum':
      out = t('MustBe', {
        cond: error.params.comparison + ' ' + error.params.limit,
      });
      break;
    case 'false schema':
      out = t('InvalidSchema');
      break;
    case 'format':
    case 'pattern':
      out = t('MustHaveFormat');
      break;
    case 'formatExclusiveMaximum':
      out = t('FormatExclusiveMaximum');
      break;
    case 'formatExclusiveMinimum':
      out = t('FormatExclusiveMinimum');
      break;
    case 'if':
      out = t('MustEquilsToSchema', { keyword: error.params.failingKeyword });
      break;
    case 'maxLength':
      out = t('ShouldBeLessThan', { n });
      break;
    case 'htmlMaxLength':
      out = t('ShouldBeLessThan', { n });
      break;
    case 'maxProperties':
      out = t('ShouldHaveLessPropertiesThan', { n });
      break;
    case 'minItems':
      out = t('ShouldIncludeMoreThan', { n });
      break;
    case 'minLength':
      out = t('ShouldBeMoreThan', { n });
      break;
    case 'htmlMinLength':
      out = t('ShouldBeMoreThan', { n });
      break;
    case 'minProperties':
      out = t('ShouldHaveMorePropertiesThan', { n });
      break;
    case 'multipleOf':
      out = t('MustBeMultipleOf', { multipleOf: error.params.multipleOf });
      break;
    case 'not':
      out = t('ShouldNotBe');
      break;
    case 'oneOf':
      out = t('ShouldBeOneOf');
      break;
    case 'patternRequired':
      out = t('ShouldPatternRequired', {
        missingPattern: error.params.missingPattern,
      });
      break;
    case 'propertyNames':
      out = t('InvalidPropertyName', {
        propertyName: error.params.propertyName,
      });
      break;
    case 'required':
      out = t('ReqiredField');
      break;
    case 'uniqueItems':
      out = t('ShouldHaveUniqueElements', {
        i: error.params.i,
        j: error.params.j,
      });
      break;
    case 'allVisibleRequired':
      out = t('AllFieldsRequired');
      break;
    case 'contactConfirmation':
      out = t('ContactConfirmationRequired');
      break;
    default:
      out = error.message;
      break;
  }

  error.message = out;
  return error;
};
