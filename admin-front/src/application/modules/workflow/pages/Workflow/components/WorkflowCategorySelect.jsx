import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Select from 'components/JsonSchema/elements/Select';
import { requestWorkflowCategories } from 'application/actions/workflow';

const WorkflowCategorySelect = ({
  t,
  categories,
  value,
  onChange,
  actions,
}) => {
  React.useEffect(() => {
    if (!categories) {
      actions.requestWorkflowCategories({
        count: 1000,
      });
    }
  }, [actions, categories]);

  const handleSelect = (chosen) => onChange(chosen);

  const selected = (categories || []).find(({ id }) => id === value)?.id;

  return (
    <Select
      options={categories || []}
      description={t('WorkflowCategory')}
      darkTheme={true}
      variant={'outlined'}
      value={selected}
      onChange={handleSelect}
    />
  );
};

WorkflowCategorySelect.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  categories: PropTypes.array,
  onChange: PropTypes.func,
};

WorkflowCategorySelect.defaultProps = {
  categories: null,
  onChange: () => null,
};

const mapStateToProps = ({ workflow: { categories } }) => ({ categories });

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestWorkflowCategories: bindActionCreators(
      requestWorkflowCategories,
      dispatch,
    ),
  },
});

const translated = translate('WorkflowAdminPage')(WorkflowCategorySelect);

export default connect(mapStateToProps, mapDispatchToProps)(translated);
